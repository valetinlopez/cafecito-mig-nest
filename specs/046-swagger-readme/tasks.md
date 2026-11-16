# Tasks 046 — Swagger/OpenAPI y README

> Fase 4. Máximo 10 tareas. Cada tarea cierra con su gate y su commit `Tn:`.

### T1 — Publicar la documentación interactiva

- **Depends on:** —
- **Archivos:** `src/common/http/swagger.setup.ts`, `src/app.setup.ts`
- **Hecho cuando:** `GET /docs` responde `200` con Swagger UI, `GET /docs-json`
  devuelve OpenAPI 3.x y una ruta inexistente sigue devolviendo `{ detail }`.
- **Commit:** `T1: publica Swagger UI en /docs desde el setup compartido`

### T2 — Documentar el health check

- **Depends on:** T1
- **Archivos:** `src/health/dto/health-response.dto.ts`,
  `src/health/health.controller.ts`
- **Hecho cuando:** el health aparece en `/docs-json` con tag `Health`, resumen y
  esquema de respuesta, y `npm test -- health` sigue en verde.
- **Commit:** `T2: documenta el health check en OpenAPI`

### T3 — Cubrir la documentación con e2e

- **Depends on:** T1, T2
- **Archivos:** `test/swagger.e2e-spec.ts`
- **Hecho cuando:** el e2e verifica `/docs`, `/docs-json`, los 32 endpoints del
  contrato, Bearer, tags, operaciones completas y el fallback 404.
- **Commit:** `T3: e2e de Swagger y del inventario de endpoints`

### T4 — README con guía de migración

- **Depends on:** T1, T2
- **Archivos:** `README.md`
- **Hecho cuando:** el README explica `/docs` (UI, JSON y Authorize), incluye la
  guía FastAPI→Nest con enlaces a ADRs y refleja el estado y la estructura reales.
- **Commit:** `T4: README con documentación interactiva y guía de migración`

### T5 — Cerrar documentación del harness

- **Depends on:** T1..T4
- **Archivos:** `src/common/DECISIONS.md`, `.agents/memory.md`,
  `specs/README.md`, `specs/046-swagger-readme/validate.md`
- **Hecho cuando:** la deuda “Sin SwaggerModule” está cerrada, la decisión del
  documento generado quedó registrada y la spec figura en el índice.
- **Commit:** `T5: cierra documentación del harness para MIG-40`

### T6 — Gates finales

- **Depends on:** T1..T5
- **Archivos:** —
- **Hecho cuando:** `npm run lint`, `npm run typecheck`, `npm test` y
  `npm run test:e2e` pasan, y `validate.md` tiene veredicto.
- **Commit:** `T6: gates finales de MIG-40`
