# Decisiones — `productos`

---

## D-01 — Decimales con `numericTransformer`

**Decisión:** `precio` es `numeric(10,2)` con `numericTransformer` y sale como
`number` en el DTO.

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

## D-03 — Relación `ManyToOne` explícita, sin `eager`

**Decisión:** `@ManyToOne(() => Categoria)` y `relations: ['categoria']` en las
consultas que lo necesitan.

**Motivo:** `eager: true` dispara joins implícitos en cada query y puede romper
listados masivos. La relación se pide solo donde hace falta (convenciones §6.1).

---

## D-04 — El stock lo descuenta `pedidos`

**Decisión:** `productos` expone lectura y CRUD; no modifica stock por ventas.

**Motivo:** el descuento ocurre en la transacción de creación del pedido, junto
con la validación de disponibilidad. Si `productos` lo hiciera por su cuenta,
habría dos escrituras no atómicas.

**Consecuencia:** `pedidos` necesita una operación de descuento expuesta por
`ProductosService` o un `UPDATE ... SET stock = stock - :n WHERE stock >= :n`.

---

## D-05 — Borrar producto vs marcar no disponible

**Decisión:** permitir `DELETE` solo si no hay pedidos asociados; recomendar
`disponible = false` en el mensaje de error.

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

**Motivo:** la FK puede no estar declarada aún en la entity (depende de MIG-29) y
el contrato exige `400`, no el `500` de una violación de FK.
