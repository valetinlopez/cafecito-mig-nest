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

## D-09 — Sin relaciones ORM hasta que existan `Pedido` y `Caja`

**Decisión:** `pedidoId`, `cajaId` y `usuarioId` quedan como columnas escalares;
no se declara `@ManyToOne(() => Pedido, pedido => pedido.pagos)` en MIG-31.

**Motivo:** el ticket lo pide, pero `Pedido` y `Caja` todavía no existen en el
código. Crear entities parciales solo para satisfacer la relación permitiría que
TypeORM altere tablas compartidas con producción (constitución §4, convenciones
§6.1). Misma decisión que se tomó en `Categoria`/`Usuario`.

**Consecuencia:** la relación bidireccional se agrega en MIG-32/MIG-44, cuando
la contra-parte exista.

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

## D-11 — El esqueleto del service falla con `501`

**Decisión:** `registrarPago`, `findByCaja` y `findByPedido` existen con sus
firmas definitivas y rechazan con `NotImplementedException` (501) mencionando
MIG-33. No devuelven `[]` ni `null`.

**Motivo:** `pedidos` y `caja` pueden programar contra las firmas desde ya, y
cualquier llamada accidental falla de forma visible en lugar de simular una
respuesta vacía que ocultaría el pendiente. `PagosModule` registra la entity,
así que MIG-33 solo agrega el repositorio y la transacción.
