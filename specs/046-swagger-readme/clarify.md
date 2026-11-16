# Clarify 046 — Swagger/OpenAPI y README

> Fase 2 del ciclo SDD. Detecta ambigüedades; no propone soluciones.

| #    | Detección                                                                                                     | Resolución                                                                                                       | Estado   |
| ---- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------- |
| C-01 | El ticket no dice si `/docs` debe existir en producción.                                                      | Decisión humana: siempre visible, igual que el `/docs` del backend FastAPI.                                      | Resuelta |
| C-02 | “Swagger UI en `/docs`” puede significar `/api/v1/docs` por el prefijo global.                                | El contrato y FastAPI usan `/docs` en la raíz. La UI queda fuera de `/api/v1`; el health también está fuera.     | Resuelta |
| C-03 | “32 endpoints documentados” no aclara si el health check cuenta dentro de los 32.                             | El contrato §1 dice “32 endpoints … más un health check”. Se documentan 33 operaciones y se verifican 32.        | Resuelta |
| C-04 | Ya existe `docs/openapi.yaml` (MIG-17). No se aclara si el documento generado lo reemplaza.                   | No lo reemplaza: el YAML sigue como contrato congelado y el generado es la vista viva. Se registra en `common`.  | Resuelta |
| C-05 | El fallback 404 está registrado después de `app.init()`; no se sabe si intercepta `/docs`.                    | Se debe montar la documentación antes del `init()` y cubrir con e2e que `/docs` no devuelve `{ detail }`.        | Resuelta |
| C-06 | El ticket no indica si la UI requiere autenticación propia.                                                   | No: describe endpoints que ya exigen JWT. La UI queda pública y usa “Authorize” para el token de prueba.         | Resuelta |
| C-07 | “README completo con guía de migración” no fija extensión ni ubicación.                                       | Sección propia en el README raíz, resumen con enlaces a ADRs y al contrato; sin duplicar documentos.             | Resuelta |
| C-08 | El ticket menciona `@ApiResponse()`, pero el código usa decoradores específicos (`@ApiOkResponse`, etc.).     | Son equivalentes; se mantiene el estilo existente y se completa solo lo que falta (health).                      | Resuelta |
| C-09 | El fallback `{ detail }` solo cubre rutas fuera del prefijo; dentro de `/api/v1` Nest responde su 404 propio. | Comportamiento preexistente (MIG-20). Fuera de alcance de MIG-40: el e2e verifica el fallback fuera del prefijo. | Resuelta |

## Ambigüedades abiertas

Ninguna. La implementación puede comenzar.
