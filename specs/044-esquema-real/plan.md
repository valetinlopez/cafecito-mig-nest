# Plan — 044-esquema-real

## 1. Enfoque

Primero se cambia el comportamiento con tests, después se alinea el mapeo y por
último se valida contra la copia de producción:

1. **Valores por defecto (RF-08..11):** los services los asignan al insertar. El
   doble en memoria deja de simularlos, y por eso los tests fallan primero.
2. **Pagos por período (RF-01..07):** se quitan `cajaId`, `usuarioId` y la
   restricción única de `Pago`. Las firmas de `PagosService` no cambian: reciben el
   id de la caja y resuelven el período con un join a `cajas`.
3. **Mapeo (RF-12):** las demás entities se alinean hasta que `schema:log` salga vacío.
4. **Validación real (RF-14..18):** se corrige la guía y se ejecuta sobre la copia.

## 2. Archivos

| Archivo                                                   | Cambio                                                                  |
| --------------------------------------------------------- | ----------------------------------------------------------------------- |
| `src/pagos/pago-periodo-caja.ts`                          | Nuevo: condición SQL única de "pago dentro del período de la caja".     |
| `src/pagos/entities/pago.entity.ts`                       | Sin `cajaId`, `usuarioId` ni `@Unique`; `fecha` sin default.            |
| `src/pagos/pagos.service.ts`, `pagos.module.ts`           | Consultas por período y `fecha` explícita; registra `Caja` en el módulo. |
| `src/pedidos/pedidos.service.ts`, `pedidos.controller.ts` | `fecha` explícita; `cobrarPedido` deja de recibir el usuario.           |
| `src/caja/caja.service.ts`                                | `fechaApertura` explícita.                                              |
| `src/reportes/reportes.service.ts`                        | `ventas_efectivo` por período.                                          |
| `src/users/users.service.ts`                              | `activo: true` explícito.                                               |
| `src/*/entities/*.entity.ts`                              | Nulabilidad, largos, `@Index` y relación `productos → categorias`.      |
| `test/utils/frontend-compat.fixtures.ts`, `test/frontend-compat.e2e-spec.ts` | Sin defaults simulados; resolvers por período.       |
| `*.spec.ts` de los módulos anteriores, `test/decimal-contract.spec.ts` | Se ajustan al nuevo comportamiento.                        |
| `docs/workflows/smoke-manual.md`                          | Sin seed ni ids fijos; contraseñas fuera del comando.                   |
| `docs/architecture.md`, `.agents/memory.md`, `specs/README.md`, `specs/038-smoke-e2e/validate.md`, docs de cada módulo | Estado y decisiones. |

## 3. Diseño

**Regla del período.** Una constante compartida evita que caja y reportes la
escriban distinto:

```ts
export const PAGO_EN_PERIODO_DE_CAJA =
  'pago.fecha >= caja.fechaApertura AND pago.fecha <= COALESCE(caja.fechaCierre, :ahora)';
```

`:ahora` es un `Date` de la aplicación, igual que en el legacy. El proceso corre en
UTC (ADR 0007), como las fechas de las columnas.

**Dependencias.** `PagosModule` registra `Caja` con `forFeature`, sin importar
`CajaModule`, igual que hace `ReportesModule`. No se forma un ciclo: `caja.entity.ts`
no importa nada de `pagos`.

**Doble cobro.** El bloqueo del pedido ya existe: el segundo cobro espera, ve el
estado `pagado` y responde `400`. Solo se quita la restricción de la entity.

**Cobro y cierre simultáneos.** El cobro bloquea la caja antes de asignar la fecha del
pago, y el cierre usa el mismo bloqueo. O el pago entra antes del cierre, o el cobro
no encuentra caja abierta.

**Email único.** La base tiene un índice único (`ix_usuarios_email`), no una
restricción. Se mapea con `@Index` y sigue dando el error `23505`, que es lo único que
miran `auth` y `empleados`.

**`productos → categorias`.** Se declara la relación sobre `categoria_id`, con su FK
real. Si choca con la propiedad `categoria` que el service completa a mano, la relación
usa una propiedad aparte.

## 4. Riesgos

| Riesgo                                                         | Mitigación                                                                  |
| -------------------------------------------------------------- | --------------------------------------------------------------------------- |
| El flujo escribe en la base equivocada.                        | El host ya se confirmó; se revisa de nuevo si cambia la URL del `.env`.      |
| `synchronize` accidental contra Neon.                          | `DB_SYNCHRONIZE` sigue sin definir; solo se usa `schema:log`.                |
| El doble en memoria vuelve a ocultar diferencias con la base.  | Sus defaults se quitan; el SQL de período se prueba en la guía real.         |
| La copia se autoborra antes de terminar.                       | Se crea otra; se cambia la URL y se confirma el host.                        |
| `schema:log` no llega a vacío por un detalle de TypeORM.       | Se analiza cada línea; lo que no se resuelva se informa, sin tocar la base.  |
| Trabajo en paralelo con el responsable de MIG-44.              | El humano lo confirma antes de implementar.                                  |

## 5. Estrategia de test

- **Unitarios:** valores asignados al insertar y consultas por período, verificando
  las llamadas al query builder.
- **e2e de compatibilidad:** el flujo completo sin defaults simulados.
- **Contra la copia:** `schema:log`, login real, flujo completo y totales históricos
  comparados con una consulta directa (caja 1: $1.300; caja 2 al 2026-11-03: $10.200,
  antes de los cobros de prueba).
- **Mutación:** quitar un valor explícito de los services debe hacer fallar los tests.
