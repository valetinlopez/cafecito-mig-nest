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
