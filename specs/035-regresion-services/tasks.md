# Tasks — 035-regresion-services

> Runner único: Vitest. No crear commits; el desarrollador realiza los commits.

### T1 — Regresión de mesas y validaciones de productos

- **Depends on:** Spec y aclaraciones aprobadas.
- **Archivos:** `src/mesas/mesas.service.spec.ts`, `src/productos/productos.service.spec.ts`, `test/productos.e2e-spec.ts`.
- **Hecho cuando:** transiciones y limpieza están verificadas; valores inválidos de producto responden 422 en create/update.
- [x] Completada; 23 tests de mesas y 9 E2E de productos pasan.

### T2 — Errores y concurrencia de pedidos

- **Depends on:** T1.
- **Archivos:** `src/pedidos/pedidos.service.spec.ts`.
- **Hecho cuando:** producto inexistente/no disponible se rechaza sin escrituras y locks de pedido/mesa/caja se verifican con mocks.
- [x] Completada; 105 tests de pedidos pasan, incluyendo producto faltante/no disponible y consulta de pedido activo.

### T3 — Proyecciones de caja y dashboard

- **Depends on:** T2.
- **Archivos:** `src/caja/caja.service.spec.ts`, `src/dashboard/dashboard.service.spec.ts`.
- **Hecho cuando:** movimientos/cero ventas están cubiertos y caja múltiple del dashboard selecciona por fecha más reciente y desempate por id.
- [x] Completada; 24 tests de caja/dashboard pasan, incluidos movimientos y selección de caja por fecha/id.

### T4 — Decimales y pool PostgreSQL

- **Depends on:** T1–T3.
- **Archivos:** tests DTO/E2E de responses numéricos, `src/database/typeorm-options.spec.ts`.
- **Hecho cuando:** responses exponen decimales como número y se verifica timeout preventivo y manejo de errores del pool.
- [x] Completada; 7 verificaciones de decimales como JSON number y opciones/handler del pool cubiertas.

### T5 — Cobertura y gates globales

- **Depends on:** T1–T4.
- **Archivos:** `specs/035-regresion-services/validate.md`.
- **Hecho cuando:** cobertura de services >85 %; lint, typecheck, unitarios y e2e completos pasan.
- [x] Completada; lint, typecheck, 411 unitarios, 82 E2E, build y diff-check pasan; cobertura de líneas de services 93.69 %.
