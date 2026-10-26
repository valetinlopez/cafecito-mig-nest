# Memoria del proyecto

> Estado vivo, no documentación de diseño. Se actualiza en cada sesión y en cada
> PR. Si algo no está acá ni en la documentación del módulo, se asume **no hecho**.

| Campo       | Valor                                                        |
| ----------- | ------------------------------------------------------------ |
| Actualizado | 2026-10-26                                                   |
| Sprint      | S1 — Auth & Usuarios                                         |
| Epic        | MIG-4 — E3: Autenticación, Usuarios & Empleados              |
| Foco actual | MIG-23 implementado, pendiente PR; siguiente MIG-24 y MIG-26 |

---

## 1. Estado por módulo

| Módulo     | Estado                                | Tests | Doc | Próximo paso                                        |
| ---------- | ------------------------------------- | ----- | --- | --------------------------------------------------- |
| test       | Implementado (MIG-21)                 | ✅    | ✅  | Ampliar helpers cuando aparezcan nuevas operaciones |
| health     | Implementado                          | ✅    | ✅  | —                                                   |
| config     | Implementado                          | ✅    | ✅  | —                                                   |
| database   | Implementado                          | ✅    | ✅  | Validar tablas en MIG-44                            |
| categorias | Implementado (solo lectura)           | ✅    | ✅  | Guard JWT en MIG-24; relación `OneToMany` en MIG-29 |
| common     | Implementado (MIG-20 + guards MIG-23) | ✅    | ✅  | Aplicar guards al resto en MIG-24                   |
| auth       | Implementado (MIG-23)                 | ✅    | ✅  | Aplicar guards al resto en MIG-24                   |
| users      | Implementado (MIG-22/25)              | ✅    | ✅  | Consumido por `empleados` (MIG-26)                  |
| empleados  | DTOs implementados (MIG-22)           | ✅    | ✅  | CRUD + service (MIG-26)                             |
| mesas      | Scaffold (módulo vacío)               | ❌    | ✅  | Entity + transiciones                               |
| productos  | Scaffold (módulo vacío)               | ❌    | ✅  | Depende de `categorias`                             |
| pedidos    | Scaffold (módulo vacío)               | ❌    | ✅  | Depende de mesas/productos/caja                     |
| pagos      | Scaffold (módulo vacío)               | ❌    | ✅  | Sin endpoints propios                               |
| caja       | Scaffold (módulo vacío)               | ❌    | ✅  | Definir `null` literal (D-09)                       |
| dashboard  | Scaffold (módulo vacío)               | ❌    | ✅  | Solo lectura                                        |
| reportes   | Scaffold (módulo vacío)               | ❌    | ✅  | Depende de pagos/caja                               |

---

## 2. Hitos cerrados

| Ticket | Entregable                                                             | Estado       |
| ------ | ---------------------------------------------------------------------- | ------------ |
| MIG-17 | Contrato de API (`api-contract.md` + `openapi.yaml`)                   | Cerrado      |
| MIG-18 | Convenciones + módulo de referencia `categorias`                       | Cerrado      |
| MIG-19 | Config tipada + validación de entorno + `DatabaseModule`               | Cerrado      |
| MIG-20 | CORS, prefijo `/api/v1`, `ValidationPipe` 422 y filtro `{ detail }`    | En revisión  |
| MIG-21 | Vitest + `test/utils/` (mocks de Repository/QueryBuilder) + cobertura  | Cerrado      |
| MIG-22 | Entity `Usuario` + DTOs con `class-validator` + tests                  | Pendiente PR |
| MIG-23 | 7 endpoints de auth + `AuthService` + `UsersService` + guards          | Pendiente PR |
| MIG-43 | Fechas UTC: proceso en UTC, transformer y `toIsoUtc()`                 | En revisión  |
| —      | Harness de trabajo (constitución, arquitectura, docs por módulo, ADRs) | Cerrado      |

---

## 3. Deuda técnica conocida

| Tema                                   | Impacto                     | Ticket |
| -------------------------------------- | --------------------------- | ------ |
| Guards no aplicados fuera de `auth`    | Módulos aún sin protección  | MIG-24 |
| Sin `SwaggerModule`                    | `/docs` no disponible       | MIG-40 |
| Sin `numericTransformer`               | `numeric` llega como string | MIG-44 |
| Mapeo `usuarios` sin validar con la DB | `schema:log` puede diferir  | MIG-44 |

---

## 4. Decisiones tomadas (índice)

| Fecha      | Decisión                                                              | Registro                  |
| ---------- | --------------------------------------------------------------------- | ------------------------- |
| 2026-10-26 | Guards y `UsersService` se adelantan a MIG-23 por dependencia         | `src/auth/DECISIONS.md`   |
| 2026-10-26 | Guard por controller + `@Public()`; sin `APP_GUARD` global            | `src/auth/DECISIONS.md`   |
| 2026-10-26 | Access token `{sub, rol}`; usuario releído de la DB en cada request   | `src/auth/DECISIONS.md`   |
| 2026-10-26 | Reset token con `purpose = reset` y 15 minutos                        | `src/auth/DECISIONS.md`   |
| 2026-10-26 | `@CurrentUser()` falla cerrado si falta el guard                      | `src/common/DECISIONS.md` |
| 2026-10-26 | `existsByEmail(email, excludeId?)` y `update()` → `null` sin fila     | `src/users/DECISIONS.md`  |
| 2026-10-22 | `email` de `usuarios` = `varchar(150)`; DTOs con `@MaxLength` espejo  | `src/users/DECISIONS.md`  |
| 2026-10-22 | DTOs de entrada en el módulo que expone el endpoint (auth/empleados)  | `src/users/DECISIONS.md`  |
| 2026-10-22 | `password_hash` con doble barrera: DTO sin campo + `@Exclude()`       | `src/users/DECISIONS.md`  |
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

| #   | Pregunta                                                                               | Bloquea               | Dueño    |
| --- | -------------------------------------------------------------------------------------- | --------------------- | -------- |
| 1   | ¿Los nombres reales son `cajas` y `detalle_pedidos`? (`usuarios` ya está en la entity) | Entities de 5 módulos | MIG-44   |
| 2   | ¿Los movimientos de caja son tabla propia o derivan de `pagos`?                        | `caja`                | MIG-44   |
| 3   | ¿El front tolera `X-Response-Time-ms` ausente? (D-11 opcional)                         | Nada                  | Front    |
| 4   | ¿Hay refresh token previsto?                                                           | `auth`                | Producto |

---

## 6. Próximo paso

1. ~~MIG-22: entity `Usuario` + DTOs~~ y ~~MIG-23: 7 endpoints de auth~~
   implementados. Abrir el PR de MIG-23 con las dependencias adelantadas
   (`UsersService` de MIG-25 y guards de MIG-24) documentadas.
2. **MIG-24:** aplicar `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('admin')`
   a `mesas`, `productos`, `categorias`, `pedidos`, `caja`, `dashboard`,
   `empleados` y `reportes`; agregar e2e de `401`/`403` por módulo.
3. **MIG-26:** `empleados` sobre `UsersService` con regla CFB-112 (siempre
   `mozo`, sin cambio de rol, sin auto-desactivación).
4. **MIG-44:** validar el mapeo de `usuarios` (y las tablas restantes) con
   `npm run schema:log` antes de crear más entities.

---

## 7. Bitácora

| Fecha      | Cambio                                                                                                                                                                                                      |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-10-20 | Se crea el harness: `AGENTS.md`, constitución, arquitectura, glosario, workflows, `agent.md`, `memory.md`, ADRs y los tres documentos por módulo.                                                           |
| 2026-10-21 | Se completan los documentos de los 15 directorios de `src/` y se enlaza el harness desde el `README.md`.                                                                                                    |
| 2026-10-21 | Se agrega `AGENTS.md` fino en cada módulo (shim de auto-load) y `docs/harness.md` con la explicación para el equipo.                                                                                        |
| 2026-10-21 | MIG-20: `CommonModule` con `{ detail }`, 422 en español, `X-Response-Time-ms`; prefijo `/api/v1`, CORS y fallback 404 en `app.setup.ts`. 77 unit + 23 e2e en verde.                                         |
| 2026-10-21 | MIG-21: `test/utils/` con mocks de `Repository`/`QueryBuilder`, helper de `TestingModule` y cobertura V8 con umbrales. 86 unit en verde.                                                                    |
| 2026-10-21 | MIG-43: proceso fijado en UTC, `utcTimestampTransformer`, `toIsoUtc()/toIsoUtcOrNull()` y ADR 0007. 117 unit + 23 e2e en verde.                                                                             |
| 2026-10-22 | MIG-22: entity `Usuario` (`usuarios`, email 150), `Rol` centralizado, `UsuarioResponseDto` y 8 DTOs de entrada (auth/empleados) validados y testeados. 149 unit en verde.                                   |
| 2026-10-26 | MIG-23: `AuthController` con los 7 endpoints, `AuthService`, `UsersService`, `JwtStrategy`, `JwtAuthGuard`/`RolesGuard` y `@Public/@Roles/@CurrentUser`. 202 unit + 50 e2e en verde; cobertura 93.6% stmts. |
