# Decisiones — `reportes`

---

## D-01 — Rango inclusivo con conversión de zona

**Decisión:** interpretar `desde` y `hasta` como fechas del negocio en
`America/Argentina/Buenos_Aires` y convertirlas a UTC para filtrar
`pagos.fecha`.

**Motivo:** el usuario pide "del 1 al 19" en su calendario. Si se filtra en UTC,
un cobro del 19 a las 22:00 local (01:00 UTC del 20) queda afuera del reporte.

**Implementación (MIG-37):** `desde` → `T00:00:00.000-03:00`; `hasta` + 1 día →
`T00:00:00.000-03:00` exclusivo. La conversión vive en
`src/common/time/business-timezone.ts` y la comparte `dashboard`.

**Riesgo:** el contrato no fija la zona; se confirma con producto y, si cambia,
se registra un ADR.

---

## D-02 — Agregaciones en SQL, una por bloque

**Decisión:** cinco consultas agregadas (resumen, métodos, productos, mesas,
cajas) ejecutadas en paralelo.

**Motivo:** el volumen de pagos puede ser alto y el reporte es la consulta más
costosa. Traer filas y agregar en JS bloquea el event loop y consume memoria.

**Costo:** cinco round-trips. Aceptable; si la latencia importa, se consolida con
CTEs en un solo query.

---

## D-03 — `pedidos_cobrados` vs `cantidad_cobros`

**Decisión:** contar `COUNT(DISTINCT pedido_id)` y `COUNT(*)` respectivamente.

**Motivo:** con la restricción de un pago por pedido deberían coincidir, pero
datos históricos del legacy pueden tener duplicados. Reportar ambos permite
detectar la anomalía en lugar de esconderla.

---

## D-04 — `ticket_promedio` dividido por cobros

**Decisión:** `total_vendido / cantidad_cobros`; si `cantidad_cobros === 0`,
devolver `0` (no `null` ni `Infinity`).

**Motivo:** el ticket de MIG-37 dice "total/cobros" y el ejemplo del contrato lo
confirma (`125000 / 84 = 1488.1`). El README previo mencionaba
`pedidos_cobrados`; se corrigió porque el contrato manda y el caso solo difiere
ante datos históricos anómalos (D-03).

**Riesgo:** el front muestra el KPI como número; `null` rompe el render e
`Infinity` no es JSON válido.

---

## D-05 — `diferencia` puede ser negativa o `null`

**Decisión:** calcular `monto_final - (monto_inicial + ventas_efectivo)`; si la
caja está abierta (`monto_final = null`), devolver `null`.

**Motivo:** una diferencia negativa es información válida (faltante de caja). No
se debe normalizar a 0 ni a valor absoluto.

**Alcance de `ventas_efectivo`:** todos los cobros en efectivo del turno de la caja
(ADR 0009), no solo los del rango consultado. La conciliación de cierre compara el `monto_final` contra
todo lo que entró en efectivo durante el turno; limitarlo al rango haría que
`diferencia` no cerrara nunca.

**No se expone `total_ventas`:** el ticket lo menciona, pero el contrato no lo
define. El contrato manda; el dato sigue disponible vía `pagos` si se necesita.

---

## D-06 — Sin paginación ni exportación en S0

**Decisión:** devolver el reporte completo del período.

**Motivo:** el contrato no define paginación (D-10) y el front no la maneja.
Exportar a CSV/PDF es una funcionalidad nueva, fuera de la migración.

---

## D-07 — `productos_mas_vendidos` limitado a 20

**Decisión:** ordenar por `cantidad DESC` (desempate por `nombre ASC`) y
devolver como máximo 20 productos.

**Motivo:** MIG-37 reproduce el `LIMIT 20` del legacy. El contrato no fija un top
N, así que el ticket es la fuente; queda registrado acá para que no se cambie
por accidente.

---

## D-08 — El eje del período es `pagos.fecha`

**Decisión:** un pedido cuenta como vendido en el período si tiene un pago cuya
`fecha` cae en el rango; no se filtra por `pedidos.estado = 'pagado'`.

**Motivo:** el estado actual del pedido puede haber cambiado (o el dato histórico
puede estar inconsistente) y el reporte debe cuadrar con el resumen, que suma
`pagos.monto`. Usar el pago como eje mantiene las cinco secciones consistentes
entre sí.

---

## D-09 — Cajas en orden cronológico

**Decisión:** devolver las cajas ordenadas por `fecha_apertura ASC` y `id ASC`.

**Motivo:** el contrato no define orden. El orden cronológico es el que espera la
lectura de cierre de turnos y es determinista.

---

## D-10 — Redondeo a dos decimales

**Decisión:** redondear `ticket_promedio`, `diferencia` y los totales derivados a
dos decimales (`Number(value.toFixed(2))`).

**Motivo:** las columnas son `numeric(10,2)` y el legacy operaba con `Decimal`.
Sin redondeo, la resta de flotantes puede devolver `499.99999999999994` y romper
la comparación exacta del frontend.

---

## D-11 — Formato en el DTO, orden en el service

**Decisión:** el formato de fecha y la obligatoriedad se validan en el DTO
(`422`); `desde > hasta` se valida en el service (`400`).

**Motivo:** el contrato distingue validación de forma (`422`) de regla de negocio
(`400`). Poner el orden en el DTO devolvería `422` y rompería el contrato; poner
el formato en el service duplicaría la validación y perdería el detalle
traducido.
