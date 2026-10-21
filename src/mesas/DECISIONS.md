# Decisiones — `mesas`

---

## D-01 — El estado es un enum de dominio, no un string libre

**Decisión:** modelar `MesaEstado` como unión de literales y validarlo en el DTO.

**Motivo:** evita valores corruptos en la base y permite que TypeScript detecte
transiciones inválidas en tiempo de compilación. El contrato ya fija los 5
valores.

---

## D-02 — La tabla de transiciones vive en un solo lugar

**Decisión:** una constante/mapa `TRANSICIONES_MESA` en el service o en un
archivo de dominio.

**Motivo:** la misma regla se consulta al cambiar estado manualmente y al validar
efectos de pedidos. Duplicarla genera inconsistencias (por ejemplo, permitir
`pendiente_cobro → libre` desde un PATCH).

---

## D-03 — Las transiciones automáticas las ejecuta `pedidos`

**Decisión:** `mesas` valida transiciones manuales; `pedidos` escribe el estado
cuando crea, entrega, cancela o cobra un pedido.

**Motivo:** la regla de negocio pertenece al ciclo del pedido. Si `mesas`
escuchara eventos del pedido, se acoplaría al módulo y se arriesga un ciclo de
dependencias.

**Consecuencia:** `pedidos` debe usar `MesasService` (o su repositorio) para
actualizar, no escribir SQL a mano.

---

## D-04 — Validar pedido activo antes de `en_limpieza`

**Decisión:** consultar si la mesa tiene un pedido activo sin cobrar antes de
permitir `ocupada → en_limpieza`.

**Motivo:** el contrato lo exige con un mensaje específico. Evita limpiar una
mesa que todavía debe cobrarse.

**Implementación:** consulta puntual al repositorio de pedidos o método exportado
por `PedidosService`; evitar `forwardRef`.

---

## D-05 — `numero` único con restricción nombrada

**Decisión:** `@Unique('mesas_numero_key', ['numero'])` (nombre a confirmar
contra la base).

**Motivo:** misma regla que `categorias`: el nombre real evita que `schema:log`
proponga recrear la restricción.

---

## D-06 — Sin borrado de mesas

**Decisión:** no hay `DELETE`.

**Motivo:** el contrato no lo define y los pedidos históricos referencian la
mesa. Si una mesa deja de usarse, se puede agregar un estado o un campo `activa`
en un ticket futuro, no borrarla.
