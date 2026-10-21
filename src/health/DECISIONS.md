# Decisiones — `health`

---

## D-01 — El health no consulta la base

**Decisión:** `getStatus()` es puramente en memoria.

**Motivo:** el front no lo consume y no debe caer por un problema transitorio de
Neon. La conexión se valida al arrancar; el smoke real es
`test/database.e2e-spec.ts` con `E2E_DATABASE=true`.

**Consecuencia:** `200` no garantiza que la base esté accesible. Si se necesita
esa señal, se agrega un endpoint separado de readiness.

---

## D-02 — Shape nuevo respecto al legacy

**Decisión:** mantener `{ status, service, version, timestamp, uptime }`.

**Motivo:** es el shape del scaffold, más informativo que `{ message, version }`,
y el front no tiene consumidores (D-14 del contrato).

---

## D-03 — `uptime` en segundos y redondeado

**Decisión:** `Math.round(process.uptime())`.

**Motivo:** el contrato lo declara `number` y no necesita subsegundos. Evita
ruido en tests y logs.

---

## D-04 — Ruta fuera del prefijo global

**Decisión:** `GET /` y exclusión explícita cuando se configure
`setGlobalPrefix('api/v1', { exclude: ['/'] })` en MIG-20.

**Motivo:** monitoreo y load balancers apuntan a la raíz. Cambiar la ruta
rompería el contrato D-01.
