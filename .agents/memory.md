# Memoria del proyecto

> Estado vivo, no documentación de diseño. Se actualiza en cada sesión y en cada
> PR. Si algo no está acá ni en la documentación del módulo, se asume **no hecho**.

| Campo       | Valor                                                |
| ----------- | ---------------------------------------------------- |
| Actualizado | 2026-10-29                                           |
| Sprint      | S3 — Pedidos, Pagos & Caja                           |
| Epic        | MIG-7 — E7: Módulo Pagos & Caja                      |
| Foco actual | MIG-45: arnés DevelopAI (SDD + agentes con permisos) |

---

## 1. Estado por módulo

| Módulo     | Estado                                | Tests | Doc | Próximo paso                                         |
| ---------- | ------------------------------------- | ----- | --- | ---------------------------------------------------- |
| test       | Implementado (MIG-21)                 | ✅    | ✅  | Ampliar helpers cuando aparezcan nuevas operaciones  |
| health     | Implementado                          | ✅    | ✅  | —                                                    |
| config     | Implementado                          | ✅    | ✅  | —                                                    |
| database   | Implementado                          | ✅    | ✅  | Validar tablas en MIG-44                             |
| categorias | Implementado (solo lectura + JWT)     | ✅    | ✅  | Relación `OneToMany` diferida a MIG-44               |
| common     | Implementado (MIG-20 + guards MIG-23) | ✅    | ✅  | Aplicar a futuros controllers                        |
| auth       | Implementado (MIG-23/25)              | ✅    | ✅  | —                                                    |
| users      | Implementado (MIG-22/25)              | ✅    | ✅  | Consumido por `empleados` (MIG-26)                   |
| empleados  | Implementado en rama MIG-26           | ✅    | ✅  | Revisión e integración                               |
| mesas      | Implementado en rama MIG-27           | ✅    | ✅  | Revisión e integración                               |
| productos  | Parcial MIG-29 (GET/POST/PATCH)       | ✅    | ✅  | DELETE pendiente; relación/transformer MIG-44        |
| pedidos    | Entities + DTOs (MIG-30)              | ✅    | ✅  | Service + controller (MIG-33)                        |
| pagos      | Entity + DTOs + esqueleto (MIG-31)    | ✅    | ✅  | Cobro y movimientos en MIG-32/33                     |
| caja       | Implementado (MIG-32; rama actual)    | ✅    | ✅  | Revisar, integrar manualmente; MIG-44 valida esquema |
| dashboard  | Scaffold (módulo vacío)               | ❌    | ✅  | Solo lectura                                         |
| reportes   | Scaffold (módulo vacío)               | ❌    | ✅  | Depende de pagos/caja                                |

---

## 2. Hitos cerrados

| Ticket | Entregable                                                              | Estado                                |
| ------ | ----------------------------------------------------------------------- | ------------------------------------- |
| MIG-17 | Contrato de API (`api-contract.md` + `openapi.yaml`)                    | Cerrado                               |
| MIG-18 | Convenciones + módulo de referencia `categorias`                        | Cerrado                               |
| MIG-19 | Config tipada + validación de entorno + `DatabaseModule`                | Cerrado                               |
| MIG-20 | CORS, prefijo `/api/v1`, `ValidationPipe` 422 y filtro `{ detail }`     | En revisión                           |
| MIG-21 | Vitest + `test/utils/` (mocks de Repository/QueryBuilder) + cobertura   | Cerrado                               |
| MIG-22 | Entity `Usuario` + DTOs con `class-validator` + tests                   | Integrado en develop                  |
| MIG-23 | 7 endpoints de auth + `AuthService` + `UsersService` + guards           | Integrado en develop                  |
| MIG-24 | JWT aplicado a endpoints disponibles de `categorias`                    | Integrado en develop                  |
| MIG-25 | Claims JWT y reset tokens alineados; bcrypt Passlib probado             | Integrado en develop                  |
| MIG-43 | Fechas UTC: proceso en UTC, transformer y `toIsoUtc()`                  | En revisión                           |
| MIG-31 | Entity `Pago` + `PagoResponseDto` + esqueleto de `PagosService`         | Cerrado                               |
| MIG-30 | Entities `Pedido`/`DetallePedido` + DTOs + relación con `Pago`          | Cerrado                               |
| MIG-32 | Caja: entity, DTOs, service, controller, movimientos y ventas derivadas | Implementado en `feature/MIG-32-caja` |
| MIG-45 | Arnés DevelopAI: ADR 0008, skills, agentes, comandos, spec piloto y CI  | Cerrado                               |
| —      | Harness de trabajo (constitución, arquitectura, docs por módulo, ADRs)  | Cerrado                               |

---

## 3. Deuda técnica conocida

| Tema                                             | Impacto                                     | Ticket |
| ------------------------------------------------ | ------------------------------------------- | ------ |
| Guards pendientes en módulos scaffold            | Sin controllers que proteger aún            | MIG-24 |
| Sin `SwaggerModule`                              | `/docs` no disponible                       | MIG-40 |
| Transformer numérico sin adoptar                 | Productos/caja siguen con conversión ad hoc | MIG-44 |
| Mapeo `pagos`/`caja_id`/`usuario_id` sin validar | Nulabilidad y FKs provisionales             | MIG-44 |
| Mapeo `usuarios` sin validar con la DB           | `schema:log` puede diferir                  | MIG-44 |

---

## 4. Decisiones tomadas (índice)

| Fecha      | Decisión                                                                | Registro                   |
| ---------- | ----------------------------------------------------------------------- | -------------------------- |
| 2026-10-29 | Adopción de SDD + orquestación multiagente con permisos por rol         | ADR 0008                   |
| 2026-10-29 | `numericTransformer` compartido se adelanta a MIG-31 (`Pago.monto`)     | `src/common/DECISIONS.md`  |
| 2026-10-29 | `pagos`: `caja_id`/`usuario_id` nullable; `cajas` sin relación ORM      | `src/pagos/DECISIONS.md`   |
| 2026-10-29 | Esqueleto de `PagosService` responde `501` hasta MIG-32/33              | `src/pagos/DECISIONS.md`   |
| 2026-10-29 | `pagos`: relación `Pago.pedido` / `Pedido.pagos` declarada en MIG-30    | `src/pagos/DECISIONS.md`   |
| 2026-10-29 | `pedidos`: FK escalar + relación sobre la misma columna; cascade insert | `src/pedidos/DECISIONS.md` |
| 2026-10-29 | `pedidos`: `subtotal` histórico, nunca se recalcula                     | `src/pedidos/DECISIONS.md` |
| 2026-10-29 | `pedidos`: `detalle_pedidos` y FK provisionales hasta MIG-44            | `src/pedidos/DECISIONS.md` |
| 2026-10-29 | `pedidos`: DTOs request/response separados y sin `monto` en el cobro    | `src/pedidos/DECISIONS.md` |
| 2026-10-26 | Guards y `UsersService` se adelantan a MIG-23 por dependencia           | `src/auth/DECISIONS.md`    |
| 2026-10-26 | Guard por controller + `@Public()`; sin `APP_GUARD` global              | `src/auth/DECISIONS.md`    |
| 2026-10-26 | Access token `{sub, rol}`; usuario releído de la DB en cada request     | `src/auth/DECISIONS.md`    |
| 2026-10-26 | Reset token con `purpose = password_reset` y 15 minutos                 | `src/auth/DECISIONS.md`    |
| 2026-10-26 | `@CurrentUser()` falla cerrado si falta el guard                        | `src/common/DECISIONS.md`  |
| 2026-10-26 | `existsByEmail(email, excludeId?)` y `update()` → `null` sin fila       | `src/users/DECISIONS.md`   |
| 2026-10-22 | `email` de `usuarios` = `varchar(150)`; DTOs con `@MaxLength` espejo    | `src/users/DECISIONS.md`   |
| 2026-10-22 | DTOs de entrada en el módulo que expone el endpoint (auth/empleados)    | `src/users/DECISIONS.md`   |
| 2026-10-22 | `password_hash` con doble barrera: DTO sin campo + `@Exclude()`         | `src/users/DECISIONS.md`   |
| 2026-10-21 | Vitest como runner único + helpers de mock en `test/utils/`             | ADR 0006                   |
| 2026-10-21 | Proceso en UTC + `utcTimestampTransformer` + `toIsoUtc()`               | ADR 0007                   |
| 2026-10-21 | Un solo `AllExceptionsFilter`; CORS en `app.setup.ts`; prefijo global   | `src/common/DECISIONS.md`  |
| 2026-10-21 | Harness híbrido: `AGENTS.md` fino por módulo + 3 docs de contenido      | `docs/harness.md`          |
| 2026-10-20 | Harness con docs por módulo en `src/<modulo>/`                          | Este archivo               |
| 2026-10-20 | Memoria global única (sin memoria por módulo)                           | Este archivo               |
| 2026-10-20 | ADRs para las decisiones transversales del contrato                     | `docs/adr/`                |
| 2026-10-19 | Módulo de referencia: `src/categorias`                                  | `conventions.md`           |
| 2026-10-19 | `synchronize` solo en dev + host local                                  | `database.config.ts`       |

---

## 5. Preguntas abiertas

| #   | Pregunta                                                                               | Bloquea               | Dueño    |
| --- | -------------------------------------------------------------------------------------- | --------------------- | -------- |
| 1   | ¿Los nombres reales son `cajas` y `detalle_pedidos`? (`usuarios` ya está en la entity) | Entities de 5 módulos | MIG-44   |
| 2   | ¿Los movimientos de caja son tabla propia o derivan de `pagos`?                        | `caja`                | MIG-44   |
| 3   | ¿El front tolera `X-Response-Time-ms` ausente? (D-11 opcional)                         | Nada                  | Front    |
| 4   | ¿Hay refresh token previsto?                                                           | `auth`                | Producto |
| 5   | ¿Se permite cobrar un pedido con `total = 0`? (spec 033, S-04)                         | Nada (supuesto)       | Producto |

---

## 6. Próximo paso

1. **MIG-45:** revisar el PR del arnés DevelopAI (ADR 0008, skills, agentes,
   comandos, `specs/033-cobro` y CI) y mergear a `develop`.
2. **MIG-33:** implementar el cobro con `specs/033-cobro/tasks.md`; MIG-30 ya
   dejó las entities y los DTOs en la rama
   `MIG-30-entities-pedido-detalle-pedido-dt-os`. El primer paso es `T1` (DTO) y
   `T2` (`PagosService.registrarPago` con `EntityManager`).
3. **MIG-32:** módulo `caja` completo, incluido `findAbierta(manager?)` que
   consume el cobro, y los movimientos derivados de `pagos`.
4. **MIG-44:** `schema:log` contra la base real; aplicar `numericTransformer` a
   productos/pedidos/caja y confirmar columnas, nulabilidad y FKs de `pagos`.

**MIG-32 en `feature/MIG-32-caja`:** entity/DTOs, cinco endpoints admin,
apertura serializada con advisory lock transaccional, cierre con
`pessimistic_write`, movimientos y sumatorias derivadas de pagos. Validación:
lint/typecheck OK, 333 unitarios y 69 e2e en verde (2 e2e omitidos). No se
validó esquema con Neon (MIG-44); no se ejecutó DDL. Sin cambios en Jira, sin
commit ni push; esperar confirmación explícita antes del push. El merge a
`develop` lo realiza manualmente el desarrollador.

---

## 7. Bitácora

| Fecha      | Cambio                                                                                                                                                                                                                                                                                                             |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-10-20 | Se crea el harness: `AGENTS.md`, constitución, arquitectura, glosario, workflows, `agent.md`, `memory.md`, ADRs y los tres documentos por módulo.                                                                                                                                                                  |
| 2026-10-21 | Se completan los documentos de los 15 directorios de `src/` y se enlaza el harness desde el `README.md`.                                                                                                                                                                                                           |
| 2026-10-21 | Se agrega `AGENTS.md` fino en cada módulo (shim de auto-load) y `docs/harness.md` con la explicación para el equipo.                                                                                                                                                                                               |
| 2026-10-21 | MIG-20: `CommonModule` con `{ detail }`, 422 en español, `X-Response-Time-ms`; prefijo `/api/v1`, CORS y fallback 404 en `app.setup.ts`. 77 unit + 23 e2e en verde.                                                                                                                                                |
| 2026-10-21 | MIG-21: `test/utils/` con mocks de `Repository`/`QueryBuilder`, helper de `TestingModule` y cobertura V8 con umbrales. 86 unit en verde.                                                                                                                                                                           |
| 2026-10-21 | MIG-43: proceso fijado en UTC, `utcTimestampTransformer`, `toIsoUtc()/toIsoUtcOrNull()` y ADR 0007. 117 unit + 23 e2e en verde.                                                                                                                                                                                    |
| 2026-10-22 | MIG-22: entity `Usuario` (`usuarios`, email 150), `Rol` centralizado, `UsuarioResponseDto` y 8 DTOs de entrada (auth/empleados) validados y testeados. 149 unit en verde.                                                                                                                                          |
| 2026-10-26 | MIG-23: `AuthController` con los 7 endpoints, `AuthService`, `UsersService`, `JwtStrategy`, `JwtAuthGuard`/`RolesGuard` y `@Public/@Roles/@CurrentUser`. 202 unit + 50 e2e en verde; cobertura 93.6% stmts.                                                                                                        |
| 2026-10-26 | MIG-24 en curso: `categorias` protegido con JWT; e2e cubre token ausente, inválido, usuario inactivo y acceso autenticado.                                                                                                                                                                                         |
| 2026-10-26 | MIG-25 en implementación: access/reset emiten `sub` string; reset usa `password_reset`/900s; `JwtStrategy` mantiene `sub` numérico legacy; agregado fixture bcrypt sintético Passlib. Validación pendiente.                                                                                                        |
| 2026-10-26 | MIG-25 mergeado en develop como PR #10: claims JWT corregidos y compatibilidad legacy validada.                                                                                                                                                                                                                    |
| 2026-10-26 | MIG-26 CRUD de empleados implementado y validado en `feature/MIG-26-empleados`; falta revisión e integración.                                                                                                                                                                                                      |
| 2026-10-26 | MIG-26 iniciado en `feature/MIG-26-empleados` desde `develop` actualizado tras pull; decisión: bcrypt en EmpleadosService, lista completa ordenada por nombre ASC.                                                                                                                                                 |
| 2026-10-27 | MIG-29 parcial en `feature/MIG-29-productos`: GET/POST/PATCH con guards, DTOs, lookup de categoría y tests. DELETE espera MIG-30; relación ORM y transformer numérico compartido esperan MIG-44.                                                                                                                   |
| 2026-10-29 | MIG-31 en `MIG-31-entity-pago-dt-os`: entity `Pago` (unique `pagos_pedido_id_key`, `numericTransformer` para `monto`, `utcTimestampTransformer` para `fecha`), `PagoResponseDto`, `METODOS_PAGO` y esqueleto de `PagosService` con `501`. `numericTransformer` se adelanta a `common`. 266 unit + 65 e2e en verde. |
| 2026-10-29 | MIG-30: entities `Pedido`/`DetallePedido` con relaciones a `mesas`, `usuarios`, `productos` y `pagos`; `PEDIDO_ESTADOS`, 6 DTOs y 49 unit en verde. `Pago` gana su `@ManyToOne(Pedido)` y se documentan D-09..D-14 de `pedidos`.                                                                                   |
| 2026-10-29 | MIG-45: se adopta DevelopAI (ADR 0008). Skills `sdd` y `nestjs-esm`, agentes `coordinator/planner/implementer/reviewer` con permisos, nueve comandos `/sdd-*`, spec piloto `specs/033-cobro` (cobro atómico, 11 RF) y CI con los cuatro gates + build. Se corrige la referencia del cobro de MIG-32 a MIG-33.      |
