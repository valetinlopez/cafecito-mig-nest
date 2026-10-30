# Tasks — 033-pedidos

> Ocho tareas atómicas; test primero y gate por tarea. No commits sin indicación
> del usuario.

## Precondiciones

- [x] Alcance integral confirmado por el usuario.
- [x] Base `develop` actualizada; MIG-30 y MIG-32 disponibles.
- [x] Spec integral revisada/aprobada por el usuario el 2026-10-29.

## T1 — Cobertura de contratos y helpers de prueba

- **Depends on:** Precondiciones
- **Archivos:** DTO specs de pedidos, `test/utils/` si hace falta.
- **Hecho cuando:** DTOs aceptan el contrato y rechazan campos extra/métodos/estados inválidos con `422`; fixtures transaccionales tipados.

## T2 — Consultas de pedidos y puerto de mesas

- **Depends on:** T1
- **Archivos:** `src/pedidos/pedidos.service.ts`, `.spec.ts`, `pedidos.module.ts`, `src/mesas/mesas.module.ts`, integración `ACTIVE_ORDERS_PORT`.
- **Hecho cuando:** `npm test -- pedidos` pasa; GET lista filtra estados activos y ordena DESC; GET detalle devuelve 404 si falta; Mesas consulta el provider real sin ciclos.

## T3 — Crear pedido con locks y control de stock

- **Depends on:** T2
- **Archivos:** `pedidos.service.ts`, `.spec.ts`.
- **Hecho cuando:** tests verifican lock de mesa, productos bloqueados en id ascendente, agregación de stock repetido, disponibilidad, cálculos, stock decrementado, detalle conservado, mesa ocupada y propagación de fallos tardíos en transacción. Implementación y tests unitarios completados.

## T4 — Máquina de estados y cascadas

- **Depends on:** T3
- **Archivos:** `pedidos.service.ts`, `.spec.ts`.
- **Hecho cuando:** cada par origen/destino permite/rechaza según spec; entrega y cancelación aplican mesa correcta; cancelación repone stock una vez; pagado no es manual. Implementación y matriz table-driven completadas.

## T5 — Persistencia y búsqueda de pago

- **Depends on:** T1
- **Archivos:** `src/pagos/pagos.service.ts`, `.spec.ts`, `DECISIONS.md`.
- **Hecho cuando:** `npm test -- pagos` pasa; registrar usa manager recibido y persiste todos los datos; find por pedido devuelve pago o null sin crear transacción propia.

## T6 — Cobro atómico doblemente bloqueado

- **Depends on:** T3, T4, T5
- **Archivos:** `pedidos.service.ts`, `.spec.ts`.
- **Hecho cuando:** lock pesimista de pedido y caja; pago, pedido pagado y mesa libre son una transacción; ausencia de caja/estado inválido/duplicado, propagación de fallo tardío y total cero verificados. Unit tests completados; rollback/concurrencia real quedan limitados a integración DB (fuera de alcance sin conexión).

## T7 — Cinco endpoints y contrato HTTP

- **Depends on:** T2–T6
- **Archivos:** `pedidos.controller.ts`, `pedidos.module.ts`, `test/pedidos.e2e-spec.ts`.
- **Hecho cuando:** E2E cubre cinco rutas, roles, status, shapes, errores, 422 y paths con/sin barra; suites e2e pasan.

## T8 — Documentación y validación final

- **Depends on:** T7
- **Archivos:** docs de `src/pedidos/`, `src/pagos/DECISIONS.md`, `docs/architecture.md`, `.agents/memory.md`, `specs/033-pedidos/validate.md`, índice SDD.
- **Hecho cuando:** gates de lint, typecheck, unitarios, e2e, build y whitespace tienen evidencia; cada RF/RNF tiene test; no se declara APROBADO con gate fallido.

## Checklist de cierre

- [x] T1–T8 implementados; veredicto final de revisión pendiente en `validate.md`
- [x] `npm run lint` · `npm run typecheck`
- [x] `npm test` · `npm run test:e2e` · `npm run build`
- [x] `validate.md` trazable con evidencia y límites de validación
- [x] Docs/memoria actualizados
