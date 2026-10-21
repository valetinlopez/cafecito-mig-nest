# Decisiones — `dashboard`

---

## D-01 — Módulo de solo lectura, sin entity

**Decisión:** `DashboardService` consulta repositorios de otros módulos; no tiene
tablas ni escribe.

**Motivo:** es una proyección para la UI. Persistir KPIs duplicaría datos y
requeriría jobs de sincronización que el negocio no necesita en S0.

---

## D-02 — Agregaciones en SQL

**Decisión:** `COUNT`/`SUM`/`GROUP BY` en la base, con `Promise.all` para bloques
independientes.

**Motivo:** cargar pedidos y pagos del día en memoria no escala y agrega latencia
al endpoint más visitado del admin. Es la misma regla de la constitución §3.

---

## D-03 — Día de negocio en hora local

**Decisión:** `ventas_dia` se calcula sobre el día en
`America/Argentina/Buenos_Aires`, convirtiendo el rango a UTC para la consulta.

**Motivo:** "ventas del día" para el negocio es el día del salón, no el día UTC.
Un corte UTC a las 21:00 locales partiría el turno de la noche.

**Riesgo:** el contrato no fija la zona. Se documenta acá y se confirma con
producto antes de implementar. Si el legacy usaba UTC, debe decidirse
explícitamente y registrarse como ADR.

---

## D-04 — `ultimos_pedidos` con límite

**Decisión:** top 5 ordenado por `fecha DESC` (ajustar al valor del legacy).

**Motivo:** es un widget de la home, no un listado. Sin límite, el response crece
sin control.

---

## D-05 — Bloques con ceros, no `null`

**Decisión:** si no hay datos, devolver `0` en contadores y `[]` en listas.

**Motivo:** el front hace aritmética y `.map()` directo. Un `null` rompe el
render; los ceros son el estado vacío natural.

---

## D-06 — Caja sin abrir

**Decisión:** `caja.estado = 'cerrada'` con `monto_inicial: null` y
`fecha_apertura: null`.

**Motivo:** el contrato tipa ambos como nullable. Se debe verificar el
comportamiento del legacy para no cambiar lo que el front ya renderiza.
