# Tasks — 037-reportes

> Tareas atómicas; no hacer commits. El desarrollador realiza los commits.

## Precondiciones

- [x] Descripción de MIG-37 consultada y alcance documentado.
- [x] Spec y aclaraciones aprobadas por instrucción de iniciar implementación.
- [x] Contrato global §6.9 y `docs/openapi.yaml` revisados.

## T1 — Rango de fechas del negocio compartido

- **Depends on:** Precondiciones
- **Archivos:** `src/common/time/business-timezone.ts`, `business-timezone.spec.ts`, `src/dashboard/dashboard.service.ts`.
- **Hecho cuando:** el helper devuelve el intervalo UTC semiabierto, `dashboard` lo consume sin cambiar su comportamiento y los tests de `dashboard` siguen verdes.
- **Commit:** `T1: extraer rango de fechas del negocio a common`

## T2 — Contrato de entrada y salida del reporte

- **Depends on:** T1
- **Archivos:** `src/reportes/dto/reporte-ventas-query.dto.ts`, `reporte-ventas-response.dto.ts`, `reporte-ventas.dto.spec.ts`.
- **Hecho cuando:** un período válido valida sin errores, un faltante responde `es obligatorio`, un formato inválido responde `YYYY-MM-DD` y el DTO ensambla el shape `snake_case`.
- **Commit:** `T2: DTOs del reporte de ventas`

## T3 — Resumen y ventas por método

- **Depends on:** T2
- **Archivos:** `src/reportes/reportes.service.ts`, `reportes.service.spec.ts`.
- **Hecho cuando:** unitarios verifican `SUM`/`COUNT`/`COUNT(DISTINCT)`, `ticket_promedio` con dos decimales, `0` sin cobros y el `GROUP BY` por método.
- **Commit:** `T3: resumen y ventas por método`

## T4 — Productos más vendidos y mesas utilizadas

- **Depends on:** T3
- **Archivos:** `src/reportes/reportes.service.ts`, `reportes.service.spec.ts`.
- **Hecho cuando:** unitarios verifican los joins a pedido/pago/producto, `LIMIT 20`, el orden por cantidad y la agrupación por mesa.
- **Commit:** `T4: productos y mesas del reporte`

## T5 — Cajas, diferencia y validación de negocio

- **Depends on:** T4
- **Archivos:** `src/reportes/reportes.service.ts`, `reportes.service.spec.ts`.
- **Hecho cuando:** unitarios verifican la intersección de cajas, `ventas_efectivo`, `diferencia` positiva/negativa/`null` y el `400` de período invertido sin consultar la base.
- **Commit:** `T5: detalle de cajas y validación del período`

## T6 — Endpoint, guards y contrato HTTP

- **Depends on:** T5
- **Archivos:** `src/reportes/reportes.controller.ts`, `reportes.module.ts`, `test/reportes.e2e-spec.ts`.
- **Hecho cuando:** e2e verifica `200` con y sin barra final, `401`, `403`, `422` y `400`; el guard exige `admin`.
- **Commit:** `T6: endpoint GET /reportes/ventas`

## T7 — Documentación y veredicto

- **Depends on:** T6
- **Archivos:** documentación de `reportes`, `docs/architecture.md`, `.agents/memory.md`, `specs/README.md`, `specs/037-reportes/validate.md`.
- **Hecho cuando:** las decisiones quedan registradas y `lint`, `typecheck`, unitarios y e2e están en verde.
- **Commit:** `T7: documentación y validación del reporte`
