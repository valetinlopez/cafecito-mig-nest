# Contrato — `common`

> Módulo de infraestructura: **no expone endpoints**. Este documento fija el
> comportamiento que garantizan sus piezas hacia el resto de la aplicación.

---

## 1. `AllExceptionsFilter`

**Salida garantizada:**

```json
{ "detail": "Mensaje en español" }
```

| Entrada                        | Status | `detail`                                |
| ------------------------------ | ------ | --------------------------------------- |
| `BadRequestException`          | `400`  | su mensaje                              |
| `UnauthorizedException`        | `401`  | `Token inválido o expirado` (si aplica) |
| `ForbiddenException`           | `403`  | `Se requiere rol de administrador`      |
| `NotFoundException`            | `404`  | `<Recurso> no encontrado`               |
| `UnprocessableEntityException` | `422`  | `Campo '<campo>': <mensaje>`            |
| Error no controlado            | `500`  | `Error interno del servidor`            |

Sin `statusCode`, `message`, `error`, `path` ni `timestamp` (ADR 0002).

- Es un **único** filtro `@Catch()`: no hay filtros por tipo que puedan quedar
  desordenados.
- Un `HttpException` con status `>= 500` también responde el mensaje genérico;
  el detalle real va a `Logger.error` con el stack.
- Si la respuesta ya fue enviada (`headersSent`), no se reescribe.
- Rutas fuera de `/api/v1` las resuelve el fallback de `app.setup.ts` con el
  mismo envelope y `detail: "Recurso no encontrado"`.

---

## 2. `AppValidationPipe`

- `whitelist: true`, `transform: true`, `forbidNonWhitelisted: false`.
- Falla con **`422`**, no `400`.
- Un solo mensaje, con prefijo `Campo '<campo>':`.
- Los campos extra se **descartan**, no se rechazan: replica a Pydantic, que los
  ignoraba (ADR 0001, D-05).
- Un mensaje propio del DTO (en español) se respeta tal cual.
- Un default de `class-validator` se traduce con
  `src/common/pipes/validation-messages.ts`.
- En objetos anidados el campo se compone con punto (`direccion.calle`).

---

## 3. Guards

### `JwtAuthGuard`

| Caso                           | Status | `detail`                             |
| ------------------------------ | ------ | ------------------------------------ |
| Sin header `Authorization`     | `401`  | `Token inválido o expirado`          |
| Token inválido o expirado      | `401`  | `Token inválido o expirado`          |
| Token sin `sub`                | `401`  | `Token sin identificador de usuario` |
| Usuario inexistente o inactivo | `401`  | `Usuario no encontrado o inactivo`   |

Adjunta el usuario autenticado al request (`@CurrentUser()`).

### `RolesGuard`

| Caso             | Status | `detail`                           |
| ---------------- | ------ | ---------------------------------- |
| Rol insuficiente | `403`  | `Se requiere rol de administrador` |

Rutas marcadas `@Public()` no pasan por el guard.

> Ambos guards llegan en MIG-24; hoy `src/common/guards/` está vacío.

---

## 4. `numericTransformer`

| Entrada     | Salida      |
| ----------- | ----------- |
| `'850.00'`  | `850`       |
| `'0.00'`    | `0`         |
| `null`      | `null`      |
| `undefined` | `undefined` |

Nunca devuelve `NaN` para valores válidos de PostgreSQL (ADR 0004).

> Llega en MIG-44.

---

## 5. `X-Response-Time-ms`

Header numérico en milisegundos (hasta dos decimales) en **todas** las
respuestas de la aplicación, incluidas las de error. No altera el body ni el
status (D-11).

- El reloj arranca en `responseTimeMiddleware` y lo cierra la primera capa que
  responda: el `ResponseTimeInterceptor`, el filtro de excepciones o el fallback 404.
- Se escribe una sola vez: si el interceptor ya lo puso, el filtro no lo pisa.
- Se expone al navegador vía `Access-Control-Expose-Headers`.
- El preflight CORS lo responde el middleware de CORS directamente y no lleva el
  header (no tiene body ni lógica de aplicación).
- Su ausencia no rompe el contrato: el front no lo consume.

---

## 6. Prefijo y CORS

### Prefijo

- Todos los recursos viven bajo `/api/v1` (`setGlobalPrefix`).
- `GET /` (health) queda excluido.
- Un path fuera del prefijo responde `404` con `{ "detail": "Recurso no encontrado" }`.

### CORS

- `origin`: los orígenes de `CORS_ORIGINS`, normalizados (sin espacios ni barra
  final).
- `credentials: true`.
- Métodos `GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS`.
- Headers de request: se reflejan los del preflight.
- `CORS_ORIGINS` vacía → `http://localhost:3000` (default del legacy).
- `CORS_ORIGINS` con `*` → se refleja el origen del request y se loguea una
  advertencia (no se puede enviar `*` con credenciales).

---

## 7. Garantías transversales

| Garantía                                  | Pieza                     |
| ----------------------------------------- | ------------------------- |
| Todo error tiene `{ detail }`             | `AllExceptionsFilter`     |
| Toda validación responde `422`            | `AppValidationPipe`       |
| Todo response tiene `X-Response-Time-ms`  | `ResponseTimeInterceptor` |
| Ningún endpoint protegido queda sin guard | `JwtAuthGuard`            |
| Los roles se validan en un solo lugar     | `RolesGuard`              |
| Los decimales llegan como `number`        | `numericTransformer`      |
| Los paths viven bajo `/api/v1`            | `app.setup.ts`            |
| Solo los orígenes configurados consumen   | `buildCorsOptions`        |
