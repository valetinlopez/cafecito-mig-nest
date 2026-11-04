# Tasks — 044-esquema-real

> Tareas atómicas; no hacer commits. El desarrollador realiza los commits.
>
> **Estado (2026-11-03):** T1..T9 hechas. T10: gates y matriz hechos; falta que el
> desarrollador borre la branch de Neon.

## Precondiciones

- [x] Descripción de MIG-44 consultada; branch de Neon creada y host confirmado.
- [x] Primera corrida de `schema:log` analizada: 39 cambios propuestos.
- [x] Opción A elegida por el humano.
- [x] Spec, ADR 0009, clarify, plan y tasks aprobados por el humano.
- [x] Confirmado con el responsable de MIG-44 que no hay trabajo en paralelo.

## T1 — Valores por defecto en los services

- **Depends on:** Precondiciones
- **Archivos:** `src/caja/caja.service.ts`, `src/pedidos/pedidos.service.ts`, `src/pagos/pagos.service.ts`, `src/users/users.service.ts` y sus `*.spec.ts`.
- **Hecho cuando:** `npm test -- caja pedidos pagos users` pasa, con tests que verifican `fechaApertura`, `fecha` y `activo: true` al crear.
- **Commit:** `T1: asignar en la aplicación los valores que la base no completa`

## T2 — Pagos por período de caja

- **Depends on:** T1
- **Archivos:** `src/pagos/pago-periodo-caja.ts`, `pagos.service.ts`, `pagos.module.ts`, `entities/pago.entity.ts` y sus `*.spec.ts`.
- **Hecho cuando:** `npm test -- pagos` pasa: movimientos y totales filtran por período, y `usuario_nombre` sale del usuario del pedido.
- **Commit:** `T2: calcular movimientos y totales por período de caja`

## T3 — Cobro sin caja ni usuario persistidos

- **Depends on:** T2
- **Archivos:** `src/pedidos/pedidos.service.ts`, `pedidos.controller.ts` y sus `*.spec.ts`.
- **Hecho cuando:** `npm test -- pedidos` pasa, incluidos `no registra pago si no hay caja abierta` y `rechaza un pedido con pago existente sin registrar un segundo pago`, y `npm run typecheck` no da errores.
- **Commit:** `T3: cobrar sin persistir caja ni usuario en el pago`

## T4 — Reportes por período

- **Depends on:** T2
- **Archivos:** `src/reportes/reportes.service.ts` y su `*.spec.ts`.
- **Hecho cuando:** `npm test -- reportes` pasa y `ventas_efectivo` usa la condición compartida.
- **Commit:** `T4: calcular ventas en efectivo por período de caja`

## T5 — Entities alineadas con la base

- **Depends on:** T2
- **Archivos:** `src/caja`, `src/categorias`, `src/mesas`, `src/pedidos`, `src/productos`, `src/users`: `entities/*.entity.ts` y sus `*.spec.ts`.
- **Hecho cuando:** `npm test` pasa y `npm run schema:log` contra la copia informa que no hay cambios.
- **Commit:** `T5: alinear entities con el esquema real`

## T6 — Prueba de compatibilidad sin defaults simulados

- **Depends on:** T3, T4, T5
- **Archivos:** `test/utils/frontend-compat.fixtures.ts`, `test/frontend-compat.e2e-spec.ts`, `test/decimal-contract.spec.ts`.
- **Hecho cuando:** `npm run test:e2e` pasa, y quitar `activo: true` o una fecha explícita de un service hace fallar la prueba.
- **Commit:** `T6: dejar de simular defaults en la prueba de compatibilidad`

## T7 — Guía manual para datos reales

- **Depends on:** T5
- **Archivos:** `docs/workflows/smoke-manual.md`.
- **Hecho cuando:** la guía no menciona el seed ni ids fijos, parte de cualquier estado de caja y pide la contraseña sin dejarla en el historial de la terminal.
- **Commit:** `T7: adaptar la guía manual a datos reales`

## T8 — Validación sobre la copia de producción

- **Depends on:** T6, T7
- **Archivos:** `specs/044-esquema-real/validate.md`.
- **Hecho cuando:** el login real y el flujo completo pasan contra la copia, y los totales históricos coinciden. El desarrollador ingresa las contraseñas en su terminal.
- **Commit:** `T8: registrar la validación contra la copia de producción`

## T9 — Documentación

- **Depends on:** T8
- **Archivos:** `docs/adr/0009-*.md` y su índice, `docs/architecture.md`, `.agents/memory.md`, `specs/README.md`, `specs/038-smoke-e2e/validate.md`, y `AGENTS`/`README`/`CONTRACT`/`DECISIONS` de `pagos`, `caja`, `reportes`, `pedidos`, `productos`, `users`, `mesas`.
- **Hecho cuando:** la decisión queda en cada módulo sin copiarla, y ningún doc afirma que `pagos` tiene `caja_id` o `usuario_id`.
- **Commit:** `T9: documentar el esquema real y el ADR 0009`

## T10 — Veredicto y cierre

- **Depends on:** T9
- **Archivos:** `specs/044-esquema-real/validate.md`.
- **Hecho cuando:** `lint`, `typecheck`, `test`, `test:e2e` y `build` están en verde, la matriz está completa, y el desarrollador borró la branch de Neon y sacó la URL del `.env`.
- **Commit:** `T10: veredicto de MIG-44`
