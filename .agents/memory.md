# Memoria del proyecto

> Estado vivo, no documentación de diseño. Se actualiza en cada sesión y en cada
> PR. Si algo no está acá ni en la documentación del módulo, se asume **no hecho**.

| Campo       | Valor                                |
| ----------- | ------------------------------------ |
| Actualizado | 2026-10-21                           |
| Sprint      | S0 — Bootcamp                        |
| Epic        | MIG-1                                |
| Foco actual | MIG-43 en revisión; siguiente MIG-44 |

---

## 1. Estado por módulo

| Módulo     | Estado                                | Tests | Doc | Próximo paso                                        |
| ---------- | ------------------------------------- | ----- | --- | --------------------------------------------------- |
| test       | Implementado (MIG-21)                 | ✅    | ✅  | Ampliar helpers cuando aparezcan nuevas operaciones |
| health     | Implementado                          | ✅    | ✅  | —                                                   |
| config     | Implementado                          | ✅    | ✅  | —                                                   |
| database   | Implementado                          | ✅    | ✅  | Validar tablas en MIG-44                            |
| categorias | Implementado (solo lectura)           | ✅    | ✅  | Guard JWT en MIG-24; relación `OneToMany` en MIG-29 |
| common     | Implementado (MIG-20 + fechas MIG-43) | ✅    | ✅  | Guards en MIG-24                                    |
| auth       | Scaffold (módulo vacío)               | ❌    | ✅  | Entidades `Usuario` + login (MIG-22/23)             |
| users      | Scaffold (módulo vacío)               | ❌    | ✅  | Entity `Usuario`                                    |
| empleados  | Scaffold (módulo vacío)               | ❌    | ✅  | Depende de `users`                                  |
| mesas      | Scaffold (módulo vacío)               | ❌    | ✅  | Entity + transiciones                               |
| productos  | Scaffold (módulo vacío)               | ❌    | ✅  | Depende de `categorias`                             |
| pedidos    | Scaffold (módulo vacío)               | ❌    | ✅  | Depende de mesas/productos/caja                     |
| pagos      | Scaffold (módulo vacío)               | ❌    | ✅  | Sin endpoints propios                               |
| caja       | Scaffold (módulo vacío)               | ❌    | ✅  | Definir `null` literal (D-09)                       |
| dashboard  | Scaffold (módulo vacío)               | ❌    | ✅  | Solo lectura                                        |
| reportes   | Scaffold (módulo vacío)               | ❌    | ✅  | Depende de pagos/caja                               |

---

## 2. Hitos cerrados

| Ticket | Entregable                                                             | Estado      |
| ------ | ---------------------------------------------------------------------- | ----------- |
| MIG-17 | Contrato de API (`api-contract.md` + `openapi.yaml`)                   | Cerrado     |
| MIG-18 | Convenciones + módulo de referencia `categorias`                       | Cerrado     |
| MIG-19 | Config tipada + validación de entorno + `DatabaseModule`               | Cerrado     |
| MIG-20 | CORS, prefijo `/api/v1`, `ValidationPipe` 422 y filtro `{ detail }`    | En revisión |
| MIG-21 | Vitest + `test/utils/` (mocks de Repository/QueryBuilder) + cobertura  | Cerrado     |
| MIG-43 | Fechas UTC: proceso en UTC, transformer y `toIsoUtc()`                 | En revisión |
| —      | Harness de trabajo (constitución, arquitectura, docs por módulo, ADRs) | Cerrado     |

---

## 3. Deuda técnica conocida

| Tema                                   | Impacto                     | Ticket |
| -------------------------------------- | --------------------------- | ------ |
| Sin `JwtAuthGuard`/`RolesGuard`        | Endpoints sin protección    | MIG-24 |
| Sin `SwaggerModule`                    | `/docs` no disponible       | MIG-40 |
| Sin `numericTransformer`               | `numeric` llega como string | MIG-44 |
| Nombres reales de tablas sin confirmar | Riesgo al crear entities    | MIG-44 |

---

## 4. Decisiones tomadas (índice)

| Fecha      | Decisión                                                              | Registro                  |
| ---------- | --------------------------------------------------------------------- | ------------------------- |
| 2026-10-21 | Vitest como runner único + helpers de mock en `test/utils/`           | ADR 0006                  |
| 2026-10-21 | Proceso en UTC + `utcTimestampTransformer` + `toIsoUtc()`             | ADR 0007                  |
| 2026-10-21 | Un solo `AllExceptionsFilter`; CORS en `app.setup.ts`; prefijo global | `src/common/DECISIONS.md` |
| 2026-10-21 | Harness híbrido: `AGENTS.md` fino por módulo + 3 docs de contenido    | `docs/harness.md`         |
| 2026-10-20 | Harness con docs por módulo en `src/<modulo>/`                        | Este archivo              |
| 2026-10-20 | Memoria global única (sin memoria por módulo)                         | Este archivo              |
| 2026-10-20 | ADRs para las decisiones transversales del contrato                   | `docs/adr/`               |
| 2026-10-19 | Módulo de referencia: `src/categorias`                                | `conventions.md`          |
| 2026-10-19 | `synchronize` solo en dev + host local                                | `database.config.ts`      |

---

## 5. Preguntas abiertas

| #   | Pregunta                                                                      | Bloquea               | Dueño    |
| --- | ----------------------------------------------------------------------------- | --------------------- | -------- |
| 1   | ¿Los nombres de tabla son exactamente `usuarios`, `cajas`, `detalle_pedidos`? | Entities de 6 módulos | MIG-44   |
| 2   | ¿Los movimientos de caja son tabla propia o derivan de `pagos`?               | `caja`                | MIG-44   |
| 3   | ¿El front tolera `X-Response-Time-ms` ausente? (D-11 opcional)                | Nada                  | Front    |
| 4   | ¿Hay refresh token previsto?                                                  | `auth`                | Producto |

---

## 6. Próximo paso

1. Confirmar esquema real contra la base (MIG-44) antes de crear entities.
2. `common` transversal cerrado en MIG-20: filtro `{ detail }`, `ValidationPipe`
   422, prefijo `/api/v1`, CORS y header de tiempo. Fechas UTC cerradas en
   MIG-43 (ADR 0007).
3. `users` + `auth`: entity `Usuario`, hash con bcrypt, login JWT (MIG-22/23).
4. `mesas` y `categorias` cerradas → `productos` → `pedidos`.

---

## 7. Bitácora

| Fecha      | Cambio                                                                                                                                                              |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-10-20 | Se crea el harness: `AGENTS.md`, constitución, arquitectura, glosario, workflows, `agent.md`, `memory.md`, ADRs y los tres documentos por módulo.                   |
| 2026-10-21 | Se completan los documentos de los 15 directorios de `src/` y se enlaza el harness desde el `README.md`.                                                            |
| 2026-10-21 | Se agrega `AGENTS.md` fino en cada módulo (shim de auto-load) y `docs/harness.md` con la explicación para el equipo.                                                |
| 2026-10-21 | MIG-20: `CommonModule` con `{ detail }`, 422 en español, `X-Response-Time-ms`; prefijo `/api/v1`, CORS y fallback 404 en `app.setup.ts`. 77 unit + 23 e2e en verde. |
| 2026-10-21 | MIG-21: `test/utils/` con mocks de `Repository`/`QueryBuilder`, helper de `TestingModule` y cobertura V8 con umbrales. 86 unit en verde.                            |
| 2026-10-21 | MIG-43: proceso fijado en UTC, `utcTimestampTransformer`, `toIsoUtc()/toIsoUtcOrNull()` y ADR 0007. 117 unit + 23 e2e en verde.                                     |
