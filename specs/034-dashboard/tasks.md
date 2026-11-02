# Tasks — 034-dashboard

> Tareas atómicas; no hacer commits. El desarrollador realiza los commits.

## Precondiciones

- [x] Descripción de MIG-34 consultada y alcance documentado.
- [x] Rama `feature/MIG-34-dashboard` creada desde `develop` actualizado.
- [x] Spec y decisiones de aclaración aprobadas por instrucción de iniciar implementación.

## T1 — Shape contractual del resumen

- **Depends on:** Precondiciones
- **Archivos:** DTO del resumen y spec.
- **Hecho cuando:** pruebas verifican nombres/valores del contrato, montos como number, fecha UTC y null explícito para caja cerrada.
- [x] Completada; validada en `dashboard.service.spec.ts`.

## T2 — Agregaciones del día, mesas y pedidos

- **Depends on:** T1
- **Archivos:** `src/dashboard/dashboard.service.ts`, `src/dashboard/dashboard.service.spec.ts`.
- **Hecho cuando:** unitarios verifican sum/count de pagos dentro del día local, conteos por estado y resultados vacíos con ceros.
- [x] Completada; validada en `dashboard.service.spec.ts`.

## T3 — Caja tolerante y pedidos recientes

- **Depends on:** T1, T2
- **Archivos:** `dashboard.service.ts`, `dashboard.service.spec.ts`.
- **Hecho cuando:** unitarios prueban ausencia y multiplicidad de cajas, y top 50 ordenado con mesa/detalles hidratados.
- [x] Completada; validada en `dashboard.service.spec.ts`.

## T4 — Endpoint protegido y contrato HTTP

- **Depends on:** T1–T3
- **Archivos:** `dashboard.controller.ts`, `dashboard.module.ts`, `test/dashboard.e2e-spec.ts`.
- **Hecho cuando:** E2E verifica `200`, shape, `401`, `403` y path con/sin barra final.
- [x] Completada; 2 pruebas E2E pasan.

## T5 — Documentación y validación

- **Depends on:** T4
- **Archivos:** documentación dashboard, `docs/architecture.md`, `.agents/memory.md`, `specs/README.md`, `specs/034-dashboard/validate.md`.
- **Hecho cuando:** decisión del límite 50 actualizada; RF/RNF tienen evidencia y lint, typecheck, unitarios, e2e y build completos están en verde.
- [x] Completada; gates y matriz de evidencia actualizados. Revisión humana del veredicto SDD pendiente.