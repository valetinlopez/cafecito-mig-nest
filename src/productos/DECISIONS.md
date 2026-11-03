# Decisiones — `productos`

---

## D-01 — Conversión de decimales transitoria hasta MIG-44

**Decisión:** `precio` se almacena como `string` proveniente de `numeric`; el
response DTO lo convierte temporalmente a `number`. El transformer compartido
se incorpora en MIG-44.

**Motivo:** `pg` devuelve `numeric` como string. Sin el transformer, el front
recibe `"850.00"` y rompe `toLocaleString` y las multiplicaciones (ADR 0004).

---

## D-02 — La categoría se expone anidada, no como `categoria_id`

**Decisión:** el response usa `categoria: { id, nombre }`; el request usa
`categoria_id`.

**Motivo:** el contrato es asimétrico a propósito: el front ya consume el objeto
anidado en `productoStore`, y envía el id al crear/editar. Respetarlo evita
tocar tipos y stores.

---

## D-03 — Categoría scalar hasta MIG-44

**Decisión:** no declarar relación ORM todavía. `categoria_id` es scalar y se
valida/hidrata vía `CategoriasService`; revisar relación luego de validar el
esquema compartido en MIG-44.

**Motivo:** la tabla compartida aún no se validó y no se debe crear una relación
especulativa. El lookup en lote evita N+1 en la colección.

---

## D-04 — El stock lo descuenta `pedidos`

**Decisión:** `productos` expone lectura y CRUD; no modifica stock por ventas.

**Motivo:** el descuento ocurre en la transacción de creación del pedido, junto
con la validación de disponibilidad. Si `productos` lo hiciera por su cuenta,
habría dos escrituras no atómicas.

**Consecuencia:** `pedidos` necesita una operación de descuento expuesta por
`ProductosService` o un `UPDATE ... SET stock = stock - :n WHERE stock >= :n`.

---

## D-05 — DELETE pendiente de MIG-30

> **Reemplazada por D-08** (MIG-38): el endpoint ya está implementado.

**Decisión:** conservar el endpoint en el contrato, pero no implementarlo hasta
MIG-30, que aportará la entidad/consulta de pedidos asociados.

**Motivo:** el historial de pedidos referencia el producto. Borrarlo rompería
detalles y reportes. El contrato fija el texto exacto del error.

---

## D-06 — `descripcion` nullable explícito

**Decisión:** el DTO declara `string | null` y el response devuelve `null`, no
omite el campo.

**Motivo:** contrato §3 exige `null` explícito. Un campo omitido rompe el tipado
del front.

---

## D-07 — Validación de `categoria_id` en el service

**Decisión:** el service verifica existencia de la categoría antes de guardar.

**Motivo:** el contrato exige `400`, no el `500` de una violación de FK. La
validación explícita se mantiene aunque el mapeo de la FK/relación ORM se
posponga hasta validar el esquema en MIG-44.

---

## D-08 — DELETE con chequeo explícito, port anti-ciclo y red de FK

**Decisión:** `remove()` responde `404` si el producto no existe; consulta
`ProductUsagePort` y responde `400` si figura en cualquier pedido, sea cual sea
su estado; y traduce a ese mismo `400` una violación de FK (`23503`). Si el
`DELETE` no afecta filas, responde `404`. `DetallePedidoUsageAdapter` implementa
el port registrando la entity `DetallePedido`, sin importar `PedidosModule`.

**Motivo:**

- `pedidos` depende de `productos`: importar su módulo crearía un ciclo. Es la
  excepción de adapters de lectura de `docs/architecture.md` §6, el mismo patrón
  que `PedidoActiveOrdersAdapter` en `mesas`.
- El legacy dependía solo de la FK, pero acá su mapeo es provisional hasta MIG-44:
  el chequeo explícito no depende de que la restricción exista.
- La FK sigue siendo necesaria: una venta entre el chequeo y el borrado la
  dispararía y, sin traducirla, el frontend recibiría un `500`.
- Se cuenta cualquier estado de pedido porque el `subtotal` histórico y los
  reportes siguen referenciando al producto.

**Origen:** breaking change detectado en MIG-38; `productoStore.eliminarProducto`
recibía `404`.
