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

---

## 2. `ValidationPipe`

- `whitelist: true`, `transform: true`, `forbidNonWhitelisted: false`.
- Falla con **`422`**, no `400`.
- Un solo mensaje, con prefijo `Campo '<campo>':`.
- Mensajes en español definidos en cada DTO (ADR 0001).

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

---

## 4. `numericTransformer`

| Entrada     | Salida      |
| ----------- | ----------- |
| `'850.00'`  | `850`       |
| `'0.00'`    | `0`         |
| `null`      | `null`      |
| `undefined` | `undefined` |

Nunca devuelve `NaN` para valores válidos de PostgreSQL (ADR 0004).

---

## 5. `X-Response-Time-ms` (opcional)

Header numérico en milisegundos en todas las respuestas. No altera el body ni el
status (D-11). Su ausencia no rompe el contrato.

---

## 6. Garantías transversales

| Garantía                                  | Pieza                 |
| ----------------------------------------- | --------------------- |
| Todo error tiene `{ detail }`             | `AllExceptionsFilter` |
| Toda validación responde `422`            | `ValidationPipe`      |
| Ningún endpoint protegido queda sin guard | `JwtAuthGuard`        |
| Los roles se validan en un solo lugar     | `RolesGuard`          |
| Los decimales llegan como `number`        | `numericTransformer`  |
