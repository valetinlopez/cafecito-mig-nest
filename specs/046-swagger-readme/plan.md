# Plan 046 — Swagger/OpenAPI y README

| Campo  | Valor                                                   |
| ------ | ------------------------------------------------------- |
| Spec   | [`spec.md`](./spec.md)                                  |
| Fase   | 3 — Plan                                                |
| Riesgo | Medio (orden del fallback 404 y cobertura de endpoints) |

## 1. Estrategia

La documentación se genera desde los decoradores existentes. El trabajo real es
**cablear `SwaggerModule` en el setup compartido**, completar el health check y
demostrar con e2e que la UI convive con el fallback `{ detail }`. El README se
cierra con una sección de uso y una guía de migración que enlaza los ADRs.

## 2. Archivos

| Archivo                                 | Cambio                                                               |
| --------------------------------------- | -------------------------------------------------------------------- |
| `src/common/http/swagger.setup.ts`      | **Nuevo.** `DocumentBuilder`, tags, Bearer y `SwaggerModule.setup`.  |
| `src/app.setup.ts`                      | Llama `setupSwagger` antes de `app.init()`; documenta el orden.      |
| `src/health/dto/health-response.dto.ts` | **Nuevo.** Contrato documental del health (solo para OpenAPI).       |
| `src/health/health.controller.ts`       | `@ApiTags`, `@ApiOperation` y `@ApiOkResponse`.                      |
| `test/swagger.e2e-spec.ts`              | **Nuevo.** `/docs`, `/docs-json`, 32 endpoints, Bearer y fallback.   |
| `README.md`                             | Documentación interactiva, guía de migración, estado y estructura.   |
| `src/common/DECISIONS.md`               | D-XX: documento generado vs `docs/openapi.yaml`; orden del fallback. |
| `.agents/memory.md`                     | Deuda “Sin SwaggerModule” cerrada y bitácora.                        |
| `specs/README.md`                       | Fila de la spec 046.                                                 |

## 3. Orden de implementación

1. **Setup** (`swagger.setup.ts` + `app.setup.ts`). Es la pieza que hace visible
   todo lo ya decorado. Verificación manual: `GET /docs` y `GET /docs-json`.
2. **Health** (DTO + decoradores). Sin esto el documento queda con un endpoint
   sin tag ni respuestas, y RF-06/RF-07 fallan.
3. **e2e** (`test/swagger.e2e-spec.ts`). Se escribe antes de dar por cerrada la
   implementación; levanta `AppModule` con `DataSource` en memoria igual que
   `frontend-compat.e2e-spec.ts`, sin PostgreSQL.
4. **README** y documentación de cierre.
5. **Gates** y `validate.md`.

## 4. Decisiones de diseño

- **Ubicación:** `src/common/http/swagger.setup.ts` porque `common` aloja el
  cableado HTTP compartido y `app.setup.ts` ya importa de `common/http`.
- **Momento:** `setupSwagger(app)` se ejecuta después del prefijo y CORS, y
  **antes** de `app.init()`. El fallback 404 se registra después del `init()`,
  así que las rutas de Swagger quedan antes en el stack de Express.
- **Paths:** `docs` y `docs-json` en la raíz, fuera de `/api/v1`; los paths del
  documento heredan el prefijo global porque los controllers lo declaran.
- **Seguridad:** `addBearerAuth()` con el nombre por defecto `bearer`, que es el
  que usan los `@ApiBearerAuth()` existentes. No se agrega guard a la UI.
- **Health:** DTO de solo documentación (`HealthResponseDto`) para no acoplar el
  service a Swagger; el controller sigue devolviendo `HealthStatus`.
- **Sin dependencias nuevas:** `@nestjs/swagger` ya está en `package.json`.
- **`docs/openapi.yaml` no se toca:** el generado es la vista viva; el YAML es
  el contrato firmado en MIG-17. Se registra en `DECISIONS.md`.

## 5. Estrategia de test

- **e2e de documento** (`test/swagger.e2e-spec.ts`):
  - `GET /docs` → `200`, HTML con `swagger-ui`.
  - `GET /docs-json` → `200`, `openapi` 3.x, `info.title`, 10 tags, esquema
    `bearer`.
  - Inventario: se normalizan barras finales y se compara contra la matriz del
    contrato §6; se cuentan 33 operaciones (32 + health).
  - Todas las operaciones tienen `summary`, `operationId` y `responses`.
  - `GET /desconocido` → `404` con `{ detail }` (el fallback sigue vivo; el
    alcance es fuera del prefijo, igual que el test de MIG-20).
- **Regresión:** el resto de los e2e sigue igual; no se tocan servicios ni DTOs
  de negocio.

## 6. Riesgos y mitigaciones

| Riesgo                                                         | Mitigación                                                                             |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| El fallback 404 tapa `/docs` por orden de middleware           | Setup antes de `init()` + e2e explícito de `/docs` y de una ruta inexistente.          |
| Los paths generados no coinciden con el contrato (barra final) | Normalización de barras en el test y verificación contra la matriz §6.                 |
| `swagger-ui-dist` no se sirve con Express 5 / ESM              | e2e valida el HTML real; si falla, se sirve el JSON y se ajusta el adapter en el plan. |
| Drift entre `docs/openapi.yaml` y el documento generado        | Decisión documentada: el YAML es contrato congelado; el generado es la vista viva.     |
| README duplica contenido de ADRs                               | Guía con tabla resumen y enlaces; el detalle queda en los ADRs.                        |

## 7. Verificación

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
```

Los cuatro gates son obligatorios para el veredicto `APROBADO`.
