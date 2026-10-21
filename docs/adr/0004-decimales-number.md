# 0004 — Decimales como `number` en JSON

| Campo     | Valor                   |
| --------- | ----------------------- |
| Estado    | Aceptado                |
| Fecha     | 2026-10-20              |
| Decisores | Equipo backend (3 devs) |
| Tags      | api, typeorm, postgres  |

## Contexto

El driver `pg` devuelve las columnas `numeric`/`decimal` como **string** para
preservar precisión. El legacy (Pydantic) las expone como `number`.

El front tipa `precio`, `total`, `subtotal`, `monto`, etc. como `number` y opera
con ellos (`toLocaleString`, multiplicaciones, comparaciones). Un string rompe
tipos, formato y cálculos.

## Decisión

Todo decimal sale como **número JSON** con 2 decimales:

```json
{ "precio": 850.0, "total": 300.0 }
```

La conversión ocurre en el borde de persistencia, no en el controller.

## Alternativas consideradas

| Alternativa                         | Por qué se descarta                  |
| ----------------------------------- | ------------------------------------ |
| Devolver string                     | Rompe tipos y operaciones del front. |
| Convertir en el controller          | Duplica la regla en cada endpoint.   |
| `parseFloat` suelto en cada service | Inconsistente y fácil de olvidar.    |

## Consecuencias

**Positivas**

- Contrato idéntico al legacy.
- Una sola regla, aplicada por columna.

**Negativas / costos**

- `number` es IEEE-754: no sirve para cálculos contables de alta precisión.
- Se debe calcular con precisión (string/`Decimal`) y convertir **solo al
  serializar** para no acumular error en totales.

## Implementación

`numericTransformer` compartido en `src/common/transformers/`:

```ts
export const numericTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) =>
    value === null || value === undefined ? value : Number(value),
};
```

Uso: `@Column('numeric', { precision: 10, scale: 2, transformer: numericTransformer })`.

**Verificación:** unitario del service que comprueba `typeof precio === 'number'`
y e2e que valida el JSON con número, no string.

## Referencias

- `docs/api-contract.md` D-05, §9.4
- `docs/conventions.md` §6.1
- Ticket MIG-44
