# 0007 — Zona horaria del proceso y columnas `timestamp` compartidas

| Campo       | Valor                                |
| ----------- | ------------------------------------ |
| Estado      | Aceptado                             |
| Fecha       | 2026-10-21                           |
| Decisores   | Equipo backend (3 devs)              |
| Tags        | api, fechas, timezone, typeorm       |
| Complementa | [ADR 0003](0003-fechas-iso-utc-z.md) |

## Contexto

El ADR 0003 fija el **contrato**: todas las fechas se serializan como ISO-8601
UTC con sufijo `Z`. Su sección de implementación asumía que todas las columnas
se modelarían como `timestamptz`.

Eso no es posible en esta migración. La base de Neon es **compartida con el
backend FastAPI**, que sigue escribiendo `pedidos.fecha`, `pagos.fecha`,
`cajas.fecha_apertura` y `cajas.fecha_cierre` como `timestamp without time zone`
con UTC _naive_. Cambiar el tipo de esas columnas alteraría el esquema de
producción fuera de una migración (Constitución §4).

Además, `pg` (Node Postgres) interpreta las columnas `timestamp without time
zone` con la zona horaria **del proceso**: la misma fila se lee distinta en una
PC en `America/Argentina/Buenos_Aires` (UTC-3) que en Render (UTC).

## Decisión

Se mantiene el contrato del ADR 0003 y el eje UTC se garantiza en la
aplicación, no en el tipo de columna:

1. Las columnas compartidas siguen siendo `timestamp` (sin zona).
2. El proceso de Node se fija en **UTC** al arrancar.
3. La escritura y la lectura de esas columnas usan un transformer explícito.
4. Los DTOs serializan con una función explícita y tipan el campo como
   `string`.

`timestamptz` queda reservado para tablas **nuevas** que no comparta el legacy.

## Alternativas consideradas

| Alternativa                                              | Por qué se descarta                                                         |
| -------------------------------------------------------- | --------------------------------------------------------------------------- |
| Migrar las columnas a `timestamptz`                      | Rompe al backend FastAPI y toca el esquema de producción (Constitución §4). |
| Confiar solo en `TZ=UTC` del proveedor                   | Si falta en un entorno, las fechas se corren 3 h sin aviso.                 |
| Confiar solo en la variable de entorno del desarrollador | Windows y Render no comparten configuración; no es reproducible.            |
| Interceptor global que convierta todo `Date` a ISO       | Oculta errores de contrato y recorre bodies anidados sin tipo.              |
| Serializar la entity directamente                        | Viola la Constitución §8 y expone columnas internas.                        |

## Consecuencias

**Positivas**

- Mismo resultado en una PC local y en Render, sin configuración manual.
- No se toca el esquema compartido con producción.
- TypeScript impide devolver un `Date` crudo en un DTO (`string` obligatorio).
- El arranque falla si el runtime no puede fijarse en UTC, en vez de servir
  fechas corridas.

**Negativas / costos**

- El proceso ya no respeta la zona local del sistema; los cálculos de "día del
  negocio" deben convertir explícitamente a `America/Argentina/Buenos_Aires`
  (`src/reportes/DECISIONS.md`, `src/dashboard/DECISIONS.md`).
- Cada entity con una columna `timestamp` del legacy debe declarar el
  transformer; olvidarlo deja la escritura a merced del driver (el proceso en
  UTC sigue cubriendo la lectura).

## Implementación

| Pieza                     | Archivo                                                | Responsabilidad                                              |
| ------------------------- | ------------------------------------------------------ | ------------------------------------------------------------ |
| `pinProcessTimezone()`    | `src/common/time/process-timezone.ts`                  | Fija `TZ=UTC`, verifica el offset real y falla si no aplica. |
| `utcTimestampTransformer` | `src/common/transformers/utc-timestamp.transformer.ts` | Escribe `YYYY-MM-DD HH:MM:SS.mmm` UTC y lee como UTC.        |
| `toIsoUtc()`              | `src/common/time/utc-date.ts`                          | Serializa el contrato con `Z` y valida la fecha.             |
| `toIsoUtcOrNull()`        | `src/common/time/utc-date.ts`                          | Normaliza `null`/`undefined` a `null` explícito.             |

Cableado:

- `main.ts` llama a `pinProcessTimezone()` **antes** de `NestFactory.create()`.
- `src/database/data-source.ts` lo llama antes de crear el `DataSource` del CLI.
- `test/setup-env.ts` lo aplica para que los tests corran en el mismo eje que
  producción.

Uso en una entity y su DTO:

```ts
@Column({ type: 'timestamp', transformer: utcTimestampTransformer })
fecha!: Date;

static fromEntity(pago: Pago): PagoResponseDto {
  const dto = new PagoResponseDto();
  dto.fecha = toIsoUtc(pago.fecha);
  return dto;
}
```

**Verificación:** unitarios con un instante conocido
(`2026-10-19T20:24:10.794Z`): formato con `Z`, round-trip, independencia de la
zona local y rechazo de fechas inválidas. E2E del health con el patrón
`^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$`.

## Referencias

- [ADR 0003 — Fechas ISO-8601 UTC con `Z`](0003-fechas-iso-utc-z.md)
- `docs/api-contract.md` D-06, §9.5
- `docs/conventions.md` §6.1
- `src/common/CONTRACT.md` §5
- Tickets MIG-43 (implementación) y MIG-44 (validación de esquema)
