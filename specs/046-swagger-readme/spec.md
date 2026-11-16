# Spec 046 — Swagger/OpenAPI completo y README de migración

| Campo   | Valor                                                                                            |
| ------- | ------------------------------------------------------------------------------------------------ |
| Ticket  | MIG-40                                                                                           |
| Epic    | MIG-11 — E10: Seed Script & Documentación                                                        |
| Estado  | Implementada; revisión humana pendiente                                                          |
| Alcance | Publicar la API documentada en `/docs` y cerrar el README con la guía de migración FastAPI→Nest. |

## 1. Contexto

La migración preserva el contrato del backend FastAPI (32 endpoints bajo
`/api/v1` más el health check en `GET /`). El contrato ya está escrito en
`docs/api-contract.md` y `docs/openapi.yaml`, y los controllers y DTOs ya llevan
decoradores de `@nestjs/swagger`: `@ApiTags` en 9 de 10 controllers, `@ApiProperty`
en los 34 DTOs, `@ApiOperation` en los 32 endpoints y respuestas tipadas en todos
los endpoints de negocio.

Lo que falta es la pieza que hace visible esa documentación: `SwaggerModule` no
está configurado, por lo que `/docs` no existe y el equipo (frontend, QA y
quienes hacen el cutover MIG-42) no tiene una referencia interactiva. Además, el
README describe el proyecto pero no explica **qué cambió** respecto del backend
Python ni **por qué**, que es el insumo que pide el ticket para el cutover.

## 2. Fuera de alcance

- Cambiar paths, campos, códigos de estado o cualquier parte del contrato.
- Reemplazar `docs/openapi.yaml` (sigue siendo la foto contractual de MIG-17).
- Agregar autenticación a la documentación ni un panel de administración de docs.
- Generar SDKs de cliente, colecciones Postman o documentación de base de datos.
- Cambiar el esquema de la base o tocar la rama de Neon.

## 3. Historia de usuario

**Como** integrante del equipo de migración (backend, frontend, QA o quien hace
el cutover), **quiero** abrir una URL con toda la API documentada y leer en el
README qué cambió respecto del backend Python, **para** integrar y operar el
backend NestJS sin releer el código ni preguntar al equipo.

## 4. Requisitos funcionales

- **RF-01** CUANDO un cliente pide `GET /docs`, EL SISTEMA DEBE responder `200`
  con la interfaz de Swagger UI servida fuera del prefijo `/api/v1`.
- **RF-02** CUANDO un cliente pide `GET /docs-json`, EL SISTEMA DEBE responder
  `200` con un documento OpenAPI 3.x en JSON.
- **RF-03** EL SISTEMA DEBE documentar en el documento OpenAPI los 32 endpoints
  del contrato agrupados en sus 9 dominios, más el health check en `GET /`.
- **RF-04** EL SISTEMA DEBE declarar el esquema de seguridad `bearer` (JWT) y
  marcar como protegidos los endpoints que usan guards, dejando públicos el
  login, el registro, la recuperación de contraseña y el health check.
- **RF-05** EL SISTEMA DEBE publicar metadatos del documento: título, versión,
  descripción con las reglas transversales (prefijo, `{ detail }`, 422, fechas
  UTC, decimales numéricos) y los 10 tags del contrato.
- **RF-06** EL SISTEMA DEBE documentar el health check con tag propio, resumen y
  esquema de respuesta.
- **RF-07** CADA operación del documento DEBE tener `summary`, `operationId` y al
  menos una respuesta documentada.
- **RF-08** SI una ruta fuera del prefijo no existe, ENTONCES EL SISTEMA DEBE
  seguir respondiendo `404` con el envelope `{ "detail": "..." }`, sin que el
  fallback intercepte `/docs` ni `/docs-json`.
- **RF-09** EL README DEBE explicar cómo abrir `/docs`, cómo autorizar con un
  token Bearer y dónde está el JSON del documento.
- **RF-10** EL README DEBE incluir una guía de migración FastAPI→NestJS que
  explique qué cambió y por qué, con enlaces a los ADRs que lo respaldan.
- **RF-11** EL README DEBE reflejar el estado real del proyecto (sprint y
  estructura de `src/`) y enlazar la documentación interactiva.
- **RF-12** CUANDO se ejecute la suite e2e, EL SISTEMA DEBE verificar la
  publicación de `/docs` y la presencia de los 32 endpoints en `/docs-json`.

## 5. Requisitos no funcionales

- **RNF-01** No agrega dependencias: usa `@nestjs/swagger`, ya instalado.
- **RNF-02** El setup vive en el cableado compartido (`configureApp`) para que
  `main.ts` y los e2e usen la misma configuración.
- **RNF-03** Imports relativos con `.js` (ESM + `nodenext`).
- **RNF-04** Sin `any`, sin `console.log` y sin `TODO` sin ticket.
- **RNF-05** Los e2e del documento no requieren PostgreSQL.
- **RNF-06** La documentación publicada es siempre visible, también en
  producción (equivalencia con el `/docs` de FastAPI).
- **RNF-07** La generación del documento no altera el arranque ni el 404
  existente.

## 6. Casos límite y errores

| Caso                                         | Resultado                                            |
| -------------------------------------------- | ---------------------------------------------------- |
| `GET /docs` en desarrollo, test y producción | `200` con Swagger UI                                 |
| `GET /docs/` con barra final                 | Sirve la UI sin redirect roto                        |
| `GET /docs-json`                             | `200` con OpenAPI 3.x                                |
| Ruta inexistente fuera del prefijo           | `404` con `{ "detail": "Recurso no encontrado" }`    |
| Health check                                 | Documentado en `/`, fuera del prefijo                |
| Endpoint público (login, registro, health)   | Sin candado de seguridad en la UI                    |
| Endpoint protegido                           | Muestra el candado y acepta el token con “Authorize” |
| Base de datos caída                          | `/docs` sigue respondiendo: el documento es estático |

## 7. Criterios de aceptación

- **CA-01** `/docs` responde `200` con Swagger UI (RF-01, RF-08).
- **CA-02** `/docs-json` contiene los 32 endpoints del contrato y el health
  (RF-02, RF-03, RF-12).
- **CA-03** El documento declara Bearer, tags y metadatos (RF-04, RF-05, RF-06).
- **CA-04** Todas las operaciones tienen resumen, id y respuestas (RF-07).
- **CA-05** El README explica `/docs` e incluye la guía de migración con su
  justificación (RF-09, RF-10, RF-11).
- **CA-06** `lint`, `typecheck`, `test` y `test:e2e` en verde.

## 8. Supuestos y preguntas abiertas

- El ticket habla de “32 endpoints”; se cuentan las operaciones de los 9 dominios
  del contrato y el health check se documenta además, sin contarlo en los 32.
- `docs/openapi.yaml` queda como contrato congelado de MIG-17; el documento
  generado por decoradores es la vista viva. La decisión se registra en
  `src/common/DECISIONS.md`.
- La UI queda siempre pública, igual que el `/docs` de FastAPI; no hay riesgo de
  exposición porque solo describe la API que ya está expuesta.
- No hay preguntas que bloqueen la implementación (`clarify.md`).

## 9. Referencias

- MIG-40 — “Swagger/OpenAPI completo + README del proyecto”.
- `docs/api-contract.md` §2 (D-01..D-16), §5 (errores) y §6 (inventario).
- `docs/openapi.yaml` (tags y metadatos del contrato).
- ADR 0001 (422), 0002 (`{ detail }`), 0003 (fechas UTC), 0004 (decimales),
  0005 (barra final), 0007 (zona horaria), 0008 (SDD) y 0009 (esquema legacy).
- Constitución §1, §3, §5, §7, §8 y §9; `src/common/AGENTS.md`.
