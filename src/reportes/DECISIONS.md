# Decisiones — `reportes`

---

## D-01 — Rango inclusivo con conversión de zona

**Decisión:** interpretar `desde` y `hasta` como fechas del negocio en
`America/Argentina/Buenos_Aires` y convertirlas a UTC para filtrar
`pagos.fecha`.

**Motivo:** el usuario pide "del 1 al 19" en su calendario. Si se filtra en UTC,
un cobro del 19 a las 22:00 local (01:00 UTC del 20) queda afuera del reporte.

**Implementación:** `desde` → `T00:00:00.000-03:00`; `hasta` + 1 día →
`T00:00:00.000-03:00` exclusivo.

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

## D-04 — `ticket_promedio` con división segura

**Decisión:** si `pedidos_cobrados === 0`, devolver `0` (no `null` ni `Infinity`).

**Motivo:** el front muestra el KPI como número. `null` rompe el render y
`Infinity` no es JSON válido.

---

## D-05 — `diferencia` puede ser negativa o `null`

**Decisión:** calcular `monto_final - (monto_inicial + ventas_efectivo)`; si la
caja está abierta (`monto_final = null`), devolver `null`.

**Motivo:** una diferencia negativa es información válida (faltante de caja). No
se debe normalizar a 0 ni a valor absoluto.

---

## D-06 — Sin paginación ni exportación en S0

**Decisión:** devolver el reporte completo del período.

**Motivo:** el contrato no define paginación (D-10) y el front no la maneja.
Exportar a CSV/PDF es una funcionalidad nueva, fuera de la migración.

---

## D-07 — `productos_mas_vendidos` sin límite explícito

**Decisión:** ordenar por `cantidad DESC` y devolver todos (o el mismo límite que
use el legacy, a confirmar).

**Motivo:** el contrato no fija un top N. Se debe verificar el legacy antes de
implementar; si limita, documentarlo acá.
