# Validate — 038-smoke-e2e

> `FC` = `test/frontend-compat.e2e-spec.ts`. Los services, guards y DTOs son
> reales; solo se simula la persistencia.

## Matriz de requisitos

| Requisito | Test / evidencia                                                                                     | Resultado |
| --------- | ---------------------------------------------------------------------------------------------------- | --------- |
| RF-01     | `FC` › un bloque por store, con las rutas exactas del frontend                                       | Pasa      |
| RF-02     | `FC` › `expectFrontendShape` en cada respuesta; `frontend-shapes.spec.ts` prueba el verificador       | Pasa      |
| RF-03     | `FC` › `crea y edita con centavos`, shapes `number`; `frontend-shapes.spec.ts` › `decimal como string` | Pasa      |
| RF-04     | `FC` › shapes `iso`; `frontend-shapes.spec.ts` › `fecha sin Z`                                       | Pasa      |
| RF-05     | `FC` › `responde el literal null si no hay caja abierta`                                             | Pasa      |
| RF-06     | `FC` › `errores que clasifica normalizeApiError` (401, 403, 404, 422, 400)                           | Pasa      |
| RF-07     | `FC` › `recorre login → pedido → estados → caja → cobro → cierre → KPIs`                             | Pasa      |
| RF-08     | `docs/workflows/smoke-manual.md`                                                                     | Escrita; **sin ejecutar** |
| RF-09     | `productos.service.spec.ts` › `elimina un producto…`; e2e `204`; `FC` › `elimina un producto sin ventas` | Pasa      |
| RF-10     | `productos.service.spec.ts` › `responde 400…`, `traduce a 400…`; `FC` › `conserva un producto con historial` | Pasa      |
| RF-11     | `productos.service.spec.ts` › `responde 404…`; `test/productos.e2e-spec.ts` › `responde 404`          | Pasa      |
| RF-12     | `test/productos.e2e-spec.ts` › `responde 401 sin token`, `responde 403 con rol mozo`                  | Pasa      |
| RF-13     | `FC` › flujo completo; `cancelar un pedido repone el stock`; `no permite cobrar sin caja abierta`     | Pasa con persistencia simulada |
| RF-14     | `FC` › `beforeAll` compila el `AppModule` real                                                        | Pasa      |
| RF-15     | `FC` › `el JWT trae los claims que leen proxy.ts y lib/jwt.ts`                                        | Pasa      |
| RNF-01    | Corre en `npm run test:e2e`, sin PostgreSQL ni red                                                    | Pasa      |
| RNF-02    | `test/utils/frontend-shapes.ts` cita el commit `3dfdb1f`                                              | Pasa      |
| RNF-03    | `package.json` sin cambios                                                                            | Pasa      |
| RNF-04    | `docs/api-contract.md` y `docs/openapi.yaml` sin cambios                                              | Pasa      |
| RNF-05    | `detalle-pedido-usage.adapter.ts`; `FC` compila sin `forwardRef`                                      | Pasa      |

## Compatibilidad por store

Rutas tomadas de `grupo1/frontend/stores/*.ts` (commit `3dfdb1f`).

| Store            | Llamadas | Endpoints                                                                  | Resultado |
| ---------------- | -------- | -------------------------------------------------------------------------- | --------- |
| `authStore`      | 6        | `login`, `GET`/`PATCH me`, `change-password`, `forgot-password`, `reset-password` | Compatible |
| `empleadoStore`  | 3        | `GET`/`POST /empleados/`, `PATCH /empleados/{id}`                          | Compatible |
| `mesaStore`      | 3        | `GET`/`POST /mesas/`, `PATCH /mesas/{id}`                                  | Compatible |
| `productoStore`  | 5        | `GET`/`POST /productos/`, `PATCH`/`DELETE /productos/{id}`, `GET /categorias/` | Compatible tras el arreglo |
| `carritoStore`   | 2        | `GET /productos/`, `POST /pedidos/`                                        | Compatible |
| `pedidoStore`    | 3        | `GET /pedidos/`, `PATCH /pedidos/{id}`, `POST /pedidos/{id}/pago`          | Compatible |
| `cajaStore`      | 5        | `GET /caja/`, `apertura`, `cierre`, `historial`, `{id}/movimientos`        | Compatible |
| `dashboardStore` | 1        | `GET /dashboard/resumen`                                                   | Compatible |
| `reportesStore`  | 1        | `GET /reportes/ventas`                                                     | Compatible |

Son 29 llamadas sobre 28 endpoints: `GET /productos/` lo usan dos stores. `uiStore`
no llama al backend.

## Breaking changes encontrados

| # | Hallazgo                                             | Impacto                                       | Estado                    |
| - | ---------------------------------------------------- | --------------------------------------------- | ------------------------- |
| 1 | Faltaba `DELETE /productos/{id}`                     | Eliminar un producto fallaba con `404`        | **Corregido** (D-08)      |
| 2 | Backend en `PORT=3000` por defecto, igual que Next   | Choque local si no se configura; no es de API | Documentado en la guía    |

No se encontró ninguna diferencia de shape, status ni formato de error en los 28
endpoints.

## Verificación de que el test detecta fallas

Se rompió el código a propósito, se corrió el smoke y se restauró cada archivo.

| Mutación                            | Resultado                       |
| ----------------------------------- | ------------------------------- |
| DTO de mesa omite `estado`          | Detectada: 4 tests fallan       |
| `precio` serializado como string    | Detectada: 3 tests fallan       |
| Mesa no pasa a `pendiente_cobro`    | Detectada: 2 tests fallan       |
| `DELETE` responde `200`             | Detectada: 1 test falla         |
| Adapter sin registrar en el módulo  | Detectada: no arranca la app    |

## Lo que NO quedó verificado

Depende de una base real y queda para `docs/workflows/smoke-manual.md`:

- SQL de dashboard, reportes, movimientos y totales. Sus resolvers están escritos
  a mano en el test: se verifica shape y conversión, no el cálculo ni los filtros
  de fecha.
- Mapeo de entities, transformers y defaults de columna (MIG-44). `activo: true` al
  crear un empleado depende del `DEFAULT` de la columna: el doble lo simula.
- Bloqueos, concurrencia y rollback de las transacciones.
- La violación de FK real en `DELETE`: se probó con un error simulado (`23503`).
- Hora correcta en pantalla y recorrido visual del frontend.

## Gates

| Gate      | Comando             | Resultado                                                |
| --------- | ------------------- | -------------------------------------------------------- |
| lint      | `npm run lint`      | OK                                                       |
| typecheck | `npm run typecheck` | OK                                                       |
| unitarios | `npm test`          | 483 tests, 60 archivos                                   |
| e2e       | `npm run test:e2e`  | 129 tests, 12 archivos (2 omitidos: requieren base real) |
| build     | `npm run build`     | OK                                                       |

Punto de partida antes de MIG-38: 452 unitarios y 87 e2e.

## VEREDICTO: APROBADO, con el smoke contra base real pendiente

Fecha: 2026-11-03. Revisor: el mismo agente que implementó, sin revisor
independiente; **falta la revisión humana**.

El criterio del ticket "Flujo E2E completo sin errores" queda cumplido sobre la
aplicación real con persistencia simulada. No queda cumplido contra PostgreSQL
hasta ejecutar la guía manual.

## Actualización por MIG-44

La guía manual se ejecutó contra una copia de producción el 2026-11-03. Encontró lo
que esta validación había dejado sin verificar: el mapeo de `pagos` y los defaults de
columna no coincidían con la base. Se corrigió en
[`specs/044-esquema-real`](../044-esquema-real/validate.md).
