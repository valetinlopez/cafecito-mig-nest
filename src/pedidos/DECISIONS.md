# Decisiones — `pedidos`

---

## D-01 — La creación es una transacción

**Decisión:** validar mesa/productos, calcular totales, insertar pedido y
detalles, descontar stock y actualizar la mesa dentro de una `QueryRunner` /
`dataSource.transaction`.

**Motivo:** si falla el descuento de stock después de insertar el pedido, queda
un pedido fantasma y stock inconsistente. La atomicidad no es opcional en un
sistema de caja.

**Verificación:** test que fuerza un error a mitad de la operación y comprueba
que no quedó nada escrito.

---

## D-02 — El total se calcula en el servidor

**Decisión:** el cliente envía `producto_id` y `cantidad`; el servidor resuelve
precio y calcula `subtotal`/`total`.

**Motivo:** confiar en un precio del cliente permite manipular el total. Además
el contrato no envía precios en el request.

---

## D-03 — El descuento de stock es atómico y condicional

**Decisión:** `UPDATE productos SET stock = stock - :n WHERE id = :id AND stock >= :n`
y verificar filas afectadas.

**Motivo:** dos pedidos concurrentes sobre el mismo producto pueden pasar la
validación de stock a la vez y dejar stock negativo. El `WHERE` lo impide a nivel
de base.

---

## D-04 — Transiciones en un mapa único

**Decisión:** `TRANSICIONES_PEDIDO` como fuente de verdad, compartida entre
`PATCH` y `POST /pago`.

**Motivo:** `entregado → pagado` solo es válido por el endpoint de pago; si el
mapa no lo distingue, un `PATCH` podría marcar un pedido como pagado sin registrar
el cobro.

**Implementación:** dos mapas o un parámetro `origen: 'manual' | 'pago'`.

---

## D-05 — `GET /pedidos/` excluye cerrados

**Decisión:** filtrar `estado NOT IN ('pagado', 'cancelado')`.

**Motivo:** el legacy muestra solo pedidos activos en la operación diaria. Los
cerrados se consultan por reportes, no por esta lista.

---

## D-06 — Reposición de stock al cancelar

**Decisión:** al pasar a `cancelado`, devolver el stock de cada detalle.

**Motivo:** el stock se descontó al crear. No reponerlo genera faltantes
ficticios. Debe hacerse en la misma transacción que el cambio de estado y ser
idempotente (no reponer dos veces si ya estaba cancelado).

---

## D-07 — `POST /pago` es una acción, no un `PATCH`

**Decisión:** mantener el path del legacy y responder `200`.

**Motivo:** el contrato lo define como acción con efectos (crea `Pago`, cierra el
pedido, libera la mesa). Cambiarlo a `PATCH /pedidos/{id}` con `estado=pagado`
rompería el front y mezclaría transición manual con cobro.

---

## D-08 — Dependencias sin `forwardRef`

**Decisión:** `pedidos` importa `MesasModule`, `ProductosModule`, `CajaModule` y
`PagosModule`; ninguno de esos importa `pedidos` a nivel de módulo.

**Motivo:** los efectos sobre la mesa los ejecuta `pedidos`; `mesas` no necesita
importar `pedidos` si la validación de "pedido activo" se resuelve con una
consulta al repositorio de pedidos o un método exportado sin dependencia
circular.

**Regla:** si aparece un ciclo, se mueve la regla al módulo dueño, no se usa
`forwardRef` (constitución §3).
