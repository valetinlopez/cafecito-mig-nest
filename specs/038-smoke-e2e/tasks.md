# Tasks — 038-smoke-e2e

> Tareas atómicas; no hacer commits. El desarrollador realiza los commits.

## Precondiciones

- [x] Descripción de MIG-38 consultada y alcance acordado con el humano.
- [x] Frontend relevado en `grupo1/frontend` (commit `3dfdb1f`): 28 llamadas.
- [x] Contrato §6.3 y §8 revisados; legacy `eliminar_producto` revisado.
- [x] Spec, clarify, plan y tasks aprobados por el humano.

## T1 — Port y adapter de uso de productos

- **Depends on:** Precondiciones
- **Archivos:** `src/productos/product-usage.port.ts`, `detalle-pedido-usage.adapter.ts`, `detalle-pedido-usage.adapter.spec.ts`, `productos.module.ts`.
- **Hecho cuando:** `npm test -- detalle-pedido-usage` pasa: devuelve `true` con un detalle, `false` sin detalles y consulta solo `id` filtrando por `productoId`.
- **Commit:** `T1: port de uso de productos en pedidos`

## T2 — `ProductosService.remove()`

- **Depends on:** T1
- **Archivos:** `src/productos/productos.service.ts`, `productos.service.spec.ts`.
- **Hecho cuando:** `npm test -- productos` pasa con: borra sin uso, `404` inexistente, `400` con uso sin llamar a `delete`, `400` ante `23503`, y otro error de base se propaga.
- **Commit:** `T2: eliminar producto sin pedidos asociados`

## T3 — Endpoint `DELETE /productos/{id}`

- **Depends on:** T2
- **Archivos:** `src/productos/productos.controller.ts`, `test/productos.e2e-spec.ts`.
- **Hecho cuando:** `npm run test:e2e -- productos` verifica `204` sin body, `400` y `404` con `detail` contractual, `401` sin token y `403` con rol `mozo`.
- **Commit:** `T3: endpoint DELETE /productos/{id}`

## T4 — Helper de shapes del frontend

- **Depends on:** Precondiciones
- **Archivos:** `test/utils/frontend-shapes.ts`, `test/utils/frontend-shapes.spec.ts`.
- **Hecho cuando:** `npm test -- frontend-shapes` verifica que el helper falla ante campo faltante, campo extra, tipo incorrecto, decimal como string, fecha sin `Z` y enum fuera de rango, y pasa con un objeto válido anidado.
- **Commit:** `T4: shapes de frontend/types/api.ts para tests`

## T5 — Doble de persistencia y arranque del `AppModule` real

- **Depends on:** T1
- **Archivos:** `test/utils/in-memory-data-source.ts`, `in-memory-data-source.spec.ts`, `frontend-compat.fixtures.ts`, `test/frontend-compat.e2e-spec.ts`.
- **Hecho cuando:** `npm test -- in-memory-data-source` pasa y el e2e levanta el `AppModule` real con solo el `DataSource` reemplazado, y hace login con el usuario del seed.
- **Commit:** `T5: AppModule real sobre persistencia en memoria`

## T6 — Auth, empleados, mesas, productos y categorías

- **Depends on:** T3, T4, T5
- **Archivos:** `test/frontend-compat.e2e-spec.ts`.
- **Hecho cuando:** el e2e verifica el shape de las llamadas de `authStore` (6), `empleadoStore` (3), `mesaStore` (3) y `productoStore` (5, incluido `DELETE` real: `204` sin uso y `400` con uso).
- **Commit:** `T6: smoke de compatibilidad — auth, empleados, mesas y productos`

## T7 — Carrito, pedidos, caja, dashboard y reportes

- **Depends on:** T6
- **Archivos:** `test/frontend-compat.e2e-spec.ts`.
- **Hecho cuando:** el e2e verifica las llamadas de `carritoStore` (2), `pedidoStore` (3), `cajaStore` (5, incluido `null` literal sin caja), `dashboardStore` (1) y `reportesStore` (1).
- **Commit:** `T7: smoke de compatibilidad — pedidos, caja, dashboard y reportes`

## T8 — Errores, barra final y flujo completo

- **Depends on:** T7
- **Archivos:** `test/frontend-compat.e2e-spec.ts`.
- **Hecho cuando:** el e2e verifica `{ detail }` en `401/403/404/422/400`, las colecciones con y sin barra final sin redirect, y los 7 pasos del flujo con sus status y los efectos sobre stock, mesa y pago.
- **Commit:** `T8: smoke de compatibilidad — errores y flujo`

## T9 — Guía manual contra base real

- **Depends on:** T3
- **Archivos:** `docs/workflows/smoke-manual.md`.
- **Hecho cuando:** la guía tiene precondiciones, los 7 pasos con `curl` y resultado esperado (incluido stock, mesa y chequeo visual de horas) y una tabla para registrar la ejecución.
- **Commit:** `T9: guía manual del smoke contra base real`

## T10 — Documentación y veredicto

- **Depends on:** T1–T9
- **Archivos:** docs de `productos`, `docs/architecture.md`, `test/README.md`, `.agents/memory.md`, `specs/README.md`, `specs/038-smoke-e2e/validate.md`.
- **Hecho cuando:** `validate.md` tiene la matriz RF → test, la tabla de compatibilidad por store y los breaking changes; `lint`, `typecheck`, `test` y `test:e2e` en verde.
- **Commit:** `T10: documentación y validación del smoke`
