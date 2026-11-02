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

**Aplicación (MIG-34):** se calcula el inicio local del día y el inicio del día
siguiente, y se consultan pagos en el intervalo semiabierto `[inicio, fin)`
después de convertir ambos límites a UTC. El contrato de `pagos.fecha` conserva
el eje UTC establecido por ADR 0007.

---

## D-04 — `ultimos_pedidos` limitados a 50

**Decisión:** top 50 de todos los estados, ordenado por `fecha DESC` y luego
`id DESC` para desempatar. `items` es la suma de cantidades de los detalles.

**Motivo:** MIG-34 fija el límite de 50. Es un widget de la home, no un listado;
el límite controla el tamaño de la respuesta. El contrato vigente nombra la
cantidad agregada `items` y el número de mesa `mesa`.

---

## D-05 — Bloques con ceros, no `null`

**Decisión:** si no hay datos, devolver `0` en contadores y `[]` en listas.

**Motivo:** el front hace aritmética y `.map()` directo. Un `null` rompe el
render; los ceros son el estado vacío natural.

---

## D-06 — Caja sin abrir

**Decisión:** `caja.estado = 'cerrada'` con `monto_inicial: null` y
`fecha_apertura: null`.

**Motivo:** el contrato tipa ambos como nullable y el frontend consume
`DashboardCajaEstado`.

---

## D-07 — Selección determinista de caja abierta

**Decisión:** consultar las cajas abiertas con `find()`, ordenadas por
`fechaApertura DESC` y `id DESC` como desempate, y representar la primera si
existe.

**Motivo:** MIG-34 requiere que el dashboard no falle si hay múltiples cajas
abiertas. Ordenar hace determinista la proyección sin lanzar una excepción por
cardinalidad ni cambiar la invariante del módulo de caja.
