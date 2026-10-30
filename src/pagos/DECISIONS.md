# Decisiones — `pagos`

---

## D-01 — Sin controller propio

**Decisión:** no crear `pagos.controller.ts`.

**Motivo:** el contrato no define `/pagos`. El cobro es una acción del pedido
(`POST /pedidos/{id}/pago`) y los movimientos se leen desde la caja. Agregar
endpoints sería un rediseño fuera de alcance (constitución §2).

---

## D-02 — Un pago por pedido

**Decisión:** restricción única sobre `pedido_id` y validación en el service.

**Motivo:** no hay cobros parciales en el negocio. Sin la restricción, un doble
clic en "cobrar" podría registrar dos pagos y duplicar las ventas del reporte.

---

## D-03 — El monto lo calcula el servidor

**Decisión:** el `Pago` usa `pedido.total`; el request no acepta `monto`.

**Motivo:** el contrato solo envía `metodo_pago`. Aceptar un monto del cliente
permitiría alterar la caja.

---

## D-04 — El pago se crea en la transacción del cobro

**Decisión:** `PedidosService` abre la transacción: valida estado y caja, crea el
`Pago`, marca el pedido `pagado`, libera la mesa y actualiza la caja.

**Motivo:** si el pago se guarda y el pedido no pasa a `pagado` (o al revés), la
caja y el salón quedan inconsistentes.

---

## D-05 — La caja se resuelve en el servidor

**Decisión:** el service busca la caja abierta; no se recibe `caja_id` por
request.

**Motivo:** solo puede haber una caja abierta. Aceptar un id permitiría imputar
un cobro a una caja cerrada.

---

## D-06 — `usuario_nombre` puede ser `null`

**Decisión:** el movimiento expone `usuario_nombre: string | null`.

**Motivo:** pagos históricos o usuarios eliminados lógicamente pueden no tener
nombre resoluble. El contrato lo tipa como nullable; no inventar un string vacío.

---

## D-07 — `metodo_pago` es un enum cerrado

**Decisión:** validar contra los 5 valores; cualquier otro → `422`.

**Motivo:** reportes agrupan por método. Un valor libre rompe las agregaciones y
los filtros del front.

---

## D-08 — `caja_id` y `usuario_id` nullable en el mapeo provisional

**Decisión:** ambas columnas se mapean `nullable: true` hasta validar el esquema
real en MIG-44. `pedido_id` sigue siendo `NOT NULL` + `UNIQUE`.

**Motivo:** el ticket MIG-31 no menciona ninguna de las dos, pero el resto del
módulo las necesita (movimientos por caja y `usuario_nombre`). Declararlas
`NOT NULL` sobre una tabla compartida con producción, con `synchronize` activo
en desarrollo, haría fallar el `ALTER TABLE` si existen filas históricas sin caja
o con usuario dado de baja (el contrato ya tipa `usuario_nombre: null`).

**Consecuencia:** la invariante "todo cobro nuevo pertenece a la caja abierta"
se valida en el service del cobro (MIG-33), no con la restricción de columna.
MIG-44 confirma tipos, nulabilidad y FKs contra la base real.

---

## D-09 — Relación con `Pedido` declarada; `Caja` sigue diferida

**Decisión:** desde MIG-30, `Pago` declara
`@ManyToOne(() => Pedido, pedido => pedido.pagos)` sobre la columna física
`pedido_id` y `Pedido` expone `pagos` como inversa de solo lectura. `cajaId` y
`usuarioId` siguen como columnas escalares y nullable.

**Motivo:** cuando se escribió MIG-31, `Pedido` no existía y crear una entity
parcial habría permitido que TypeORM altere una tabla compartida con producción
(constitución §4, convenciones §6.1). MIG-30 crea `Pedido`, así que la
contraparte ya existe y la relación se completa sin `forwardRef`. La relación con
`cajas` se mantiene diferida a MIG-32/MIG-44 porque esa entity todavía no existe.

**Consecuencia:** la FK se declara con el nombre de PostgreSQL
(`pagos_pedido_id_fkey`) y MIG-44 lo confirma con `schema:log`. El pago se sigue
creando dentro de la transacción del cobro (MIG-33), no por cascada.

---

## D-10 — `numericTransformer` compartido, no local

**Decisión:** `monto` usa el `numericTransformer` de
`src/common/transformers/numeric.transformer.ts` (creado en este ticket), no una
copia dentro de `pagos`.

**Motivo:** es la única regla `numeric → number` del proyecto (ADR 0004) y
`common` D-04 prohíbe copiarla por módulo. El DTO refuerza con `Number()` para
que el contrato no dependa del transformer.

**Consecuencia:** MIG-44 aplica el mismo transformer a `productos.precio`,
`pedidos.total` y los montos de caja, y retira las conversiones ad hoc.

---

## D-11 — El service migra por responsabilidad de ticket

**Decisión:** `findByCaja`, `getTotalVentas` y `getTotalesVentas` leen la
proyección de pagos para Caja en MIG-32. `registrarPago` y `findByPedido` se
implementan en MIG-33.

**Motivo:** el service implementa las consultas que requiere caja sin adelantar
el flujo de cobro de pedidos. Los movimientos se proyectan con joins a pedido,
mesa y usuario; los totales del historial se agrupan por caja y se convierten a
`number`, normalizando ausencia de pagos a cero.

**Consecuencia:** la tabla real, columnas y FKs se verifican en MIG-44; no se
agrega relación ORM de `Pago` a `Caja`.

## D-12 — El manager transaccional es obligatorio al registrar

**Decisión:** `registrarPago(manager, input)` persiste con el repositorio del
`EntityManager` recibido. `findByPedido(id, manager?)` usa el mismo manager
cuando el cobro necesita verificar dentro de su transacción.

**Motivo:** impedir que el pago se escriba fuera de la transacción que cambia el
pedido a `pagado` y libera su mesa.
