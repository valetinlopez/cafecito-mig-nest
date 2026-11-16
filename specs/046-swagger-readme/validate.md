# Validate 046 — Swagger/OpenAPI y README

| Campo  | Valor                                    |
| ------ | ---------------------------------------- |
| Spec   | [`spec.md`](./spec.md)                   |
| Fase   | 6 — Validación                           |
| Fecha  | 2026-11-16                               |
| Perfil | Implementación completa; revisión humana |

## 1. Matriz requisito → evidencia

| Requisito | Test / evidencia                                                                                                                                                               | Resultado         |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------- |
| RF-01     | `test/swagger.e2e-spec.ts` › `GET /docs sirve Swagger UI`                                                                                                                      | Pasa              |
| RF-02     | `test/swagger.e2e-spec.ts` › `GET /docs-json devuelve un documento OpenAPI 3.x`                                                                                                | Pasa              |
| RF-03     | `test/swagger.e2e-spec.ts` › `documenta los 32 endpoints del contrato más el health check`                                                                                     | Pasa              |
| RF-04     | `test/swagger.e2e-spec.ts` › `declara el esquema de seguridad bearer`, `deja públicos login, recuperación de contraseña y health`, `marca los endpoints protegidos con bearer` | Pasa              |
| RF-05     | `test/swagger.e2e-spec.ts` › `GET /docs-json devuelve un documento OpenAPI 3.x` y `declara los 10 tags del contrato`                                                           | Pasa              |
| RF-06     | `test/swagger.e2e-spec.ts` › `documenta el health con tag propio y respuesta`                                                                                                  | Pasa              |
| RF-07     | `test/swagger.e2e-spec.ts` › `cada operación tiene resumen, operationId y respuesta`                                                                                           | Pasa              |
| RF-08     | `test/swagger.e2e-spec.ts` › `GET /docs no cae en el fallback` y `conserva el envelope { detail } en rutas fuera del prefijo`                                                  | Pasa              |
| RF-09     | `README.md` §“Documentación interactiva (Swagger)” (UI, JSON y Authorize)                                                                                                      | Verificado a mano |
| RF-10     | `README.md` §“Guía de migración desde FastAPI” (tabla, qué cambió y por qué, enlaces a ADRs)                                                                                   | Verificado a mano |
| RF-11     | `README.md` §“Estado de la migración” (S5) y §“Documentación de API” (`/docs`)                                                                                                 | Verificado a mano |
| RF-12     | `npm run test:e2e` incluye `test/swagger.e2e-spec.ts` (11 casos)                                                                                                               | Pasa              |

## 2. Casos límite cubiertos

| Caso                                 | Evidencia                                               | Resultado |
| ------------------------------------ | ------------------------------------------------------- | --------- |
| `/docs` fuera de `/api/v1`           | Test de UI: `200` con `text/html` y `swagger-ui`        | Pasa      |
| `/docs-json` disponible              | Test del documento: `200 application/json`              | Pasa      |
| Health en `/`, fuera del prefijo     | Inventario + tag `Health` + respuesta `200` documentada | Pasa      |
| Endpoints públicos sin candado       | Test de operaciones públicas                            | Pasa      |
| Endpoints protegidos con Bearer      | Test de operaciones protegidas                          | Pasa      |
| Fallback 404 sigue respondiendo JSON | Test de `/desconocido` con `{ detail }`                 | Pasa      |
| 33 operaciones (32 + health)         | Conteo exacto en el e2e                                 | Pasa      |

## 3. Gates

| Gate      | Comando             | Resultado                                           |
| --------- | ------------------- | --------------------------------------------------- |
| Lint      | `npm run lint`      | OK                                                  |
| Typecheck | `npm run typecheck` | OK                                                  |
| Unitarios | `npm test`          | 524 tests en 64 archivos                            |
| E2E       | `npm run test:e2e`  | 140 tests en 13 archivos (2 omitidos: requieren DB) |
| Build     | `npm run build`     | OK                                                  |

## 4. Observaciones

- El fallback `{ detail }` solo cubre rutas **fuera** del prefijo; dentro de
  `/api/v1`, Nest responde su 404 propio. Es comportamiento preexistente de
  MIG-20 y quedó fuera de alcance (C-09 de `clarify.md`).
- La verificación visual de `/docs` se hizo a través del e2e (HTML servido y
  documento generado); no se abrió un navegador real.
- No se modificaron el contrato, el esquema de la base ni las dependencias.
- Sin commit ni push: los realiza el desarrollador.

## 5. VEREDICTO: APROBADO

Implementación completa, cuatro gates en verde y matriz de requisitos cubierta.
Queda la revisión humana del PR y del veredicto.
