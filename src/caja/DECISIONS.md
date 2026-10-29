# Decisiones — `caja`

---

## D-01 — `GET /caja/` devuelve `null` literal

**Decisión:** cuando no hay caja abierta, responder `200` con body `null` usando
`res.json(null)` (o un `StreamableFile` equivalente), no `return null` directo.

**Motivo:** en NestJS, `return null` puede terminar en body vacío; el front
recibe `undefined` y rompe el tipo `Caja | null` (D-09). Verificar con e2e que el
body parseado sea exactamente `null`.

---

## D-02 — `total_ventas` es calculado

**Decisión:** no persistir `total_ventas`; sumar los pagos de la caja al
serializar.

**Motivo:** es un dato derivado. Persistirlo obliga a mantenerlo sincronizado en
cada cobro y abre la puerta a inconsistencias.

**Costo:** una consulta agregada por request. Aceptable con el volumen del
negocio; si crece, se puede cachear o materializar en un ticket futuro.

---

## D-03 — Una sola caja abierta

**Decisión:** serializar aperturas con una transacción y
`pg_advisory_xact_lock`, luego validar e insertar si no existe otra caja
abierta.

**Motivo:** dos aperturas simultáneas rompen la consolidación de ventas. La
validación sola tiene una condición de carrera.

**Implementación (MIG-32):** adquirir una clave fija para la operación de
apertura mediante advisory transaction lock. Al no existir fila abierta, un
lock de fila no serializaría dos inserts concurrentes. El advisory lock evita
DDL y no modifica el esquema compartido.

---

## D-04 — El cierre no recalcula ventas

**Decisión:** el cierre guarda `monto_final` del body, setea `fecha_cierre` y
`estado = 'cerrada'`.

**Motivo:** el contrato pide el monto final contado por el usuario. La diferencia
contra lo esperado se calcula en reportes, no se corrige acá.

---

## D-05 — Movimientos derivados de `pagos`

**Decisión:** no crear una tabla `movimientos_caja`; los movimientos son pagos
filtrados por `caja_id`, proyectados con pedido, mesa y usuario nullable y
ordenados por fecha descendente.

**Motivo:** un movimiento no tiene datos propios: es un pago del período. Una
tabla espejo duplicaría información y podría desincronizarse.

**Riesgo:** si el negocio agrega movimientos que no son cobros (retiros,
ingresos manuales), habrá que crear la tabla. Queda anotado en
`.agents/memory.md` como pregunta abierta.

---

## D-06 — `mesa_numero` se resuelve en la consulta

**Decisión:** el DTO de movimiento arma `mesa_numero` con un join
`pago → pedido → mesa`.

**Motivo:** el front muestra el número de mesa, no su id. Resolverlo en la base
evita N+1.

---

## D-07 — Historial sin límite

**Decisión:** devolver todas las cajas ordenadas por `fecha_apertura DESC`.

**Motivo:** el contrato no define paginación (D-10). Si el historial crece, se
aborda como rediseño futuro con el front, no en la migración.
