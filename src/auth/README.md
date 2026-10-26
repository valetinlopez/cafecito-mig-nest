# Módulo `auth`

| Campo        | Valor                                                                   |
| ------------ | ----------------------------------------------------------------------- |
| Estado       | **Implementado** (MIG-23; guards y service adelantados)                 |
| Endpoints    | 7 (ver [`CONTRACT.md`](./CONTRACT.md))                                  |
| Dependencias | `users` (`UsersService`), `config/auth`, `common` (guards)              |
| Tests        | `auth.service.spec.ts`, `jwt.strategy.spec.ts`, `test/auth.e2e-spec.ts` |

---

## 1. Responsabilidad

Autenticación y gestión de la identidad: login con JWT, registro de usuarios
(solo admin), perfil propio, cambio y recuperación de contraseña.

El módulo es dueño del **borde de seguridad**: emite el token, valida
credenciales y expone el usuario autenticado. La entity `Usuario` y su acceso a
datos viven en `users`; `auth` los consume a través de `UsersService`.

---

## 2. Estado actual

```
src/auth/
├── auth.module.ts                 # UsersModule + PassportModule + JwtModule
├── auth.controller.ts             # los 7 endpoints
├── auth.service.ts                # negocio: bcrypt, JWT, reset tokens
├── auth.service.spec.ts
├── auth-messages.ts               # literales del contrato
├── jwt-payload.ts                 # payloads y constantes de expiración
├── strategies/
│   ├── jwt.strategy.ts            # valida el Bearer y resuelve el usuario
│   └── jwt.strategy.spec.ts
└── dto/
    ├── login.dto.ts
    ├── register.dto.ts
    ├── update-profile.dto.ts
    ├── change-password.dto.ts
    ├── forgot-password.dto.ts
    ├── reset-password.dto.ts
    ├── token-response.dto.ts
    ├── message-response.dto.ts
    ├── forgot-password-response.dto.ts
    ├── auth-dtos.spec.ts
    └── auth-response-dtos.spec.ts
```

Los guards y decoradores transversales viven en `src/common/`:
`JwtAuthGuard`, `RolesGuard`, `@Public()`, `@Roles()` y `@CurrentUser()`.

---

## 3. Capas

| Pieza            | Responsabilidad                                                           |
| ---------------- | ------------------------------------------------------------------------- |
| `AuthController` | Traduce HTTP ↔ service. No verifica credenciales ni toca el repo.         |
| `AuthService`    | bcrypt, firma/verificación de JWT, tokens de reseteo y reglas de negocio. |
| `JwtStrategy`    | Valida el Bearer, rechaza tokens de reseteo y relee el usuario de la DB.  |
| `UsersService`   | Único acceso a la tabla `usuarios` (dueño: módulo `users`).               |
| DTOs             | Contrato de entrada/salida, en `snake_case`, con `fromEntity()`.          |

---

## 4. Endpoints

Ver [`CONTRACT.md`](./CONTRACT.md) para el detalle de request/response.

| Método  | Path                           | Auth    | Éxito |
| ------- | ------------------------------ | ------- | ----- |
| `POST`  | `/api/v1/auth/login`           | público | `200` |
| `POST`  | `/api/v1/auth/register`        | admin   | `201` |
| `GET`   | `/api/v1/auth/me`              | auth    | `200` |
| `PATCH` | `/api/v1/auth/me`              | auth    | `200` |
| `POST`  | `/api/v1/auth/change-password` | auth    | `200` |
| `POST`  | `/api/v1/auth/forgot-password` | público | `200` |
| `POST`  | `/api/v1/auth/reset-password`  | público | `200` |

---

## 5. Reglas de negocio

- Login inválido → `401` `Email o contraseña incorrectos`.
- Usuario inactivo con credenciales válidas → `401` `Usuario no encontrado o inactivo`.
- Email duplicado en registro → `400` `El email ya está registrado`.
- Cambio de contraseña con actual incorrecta → `400` `La contraseña actual es incorrecta`.
- Token de reset inválido o expirado → `400` `Token inválido o expirado`.
- `password_nueva` mínimo 6 caracteres → `422` si no cumple.
- `reset_token` se devuelve **solo** en `development` (D-15); en el resto, `null`.
- El token de reseteo dura 15 minutos y lleva `purpose = reset`: **no** sirve
  como access token.

---

## 6. Dependencias y orden de implementación

```
users (entity + UsersService) → auth (login/JWT/controller) → guards → resto de módulos
             MIG-22/25                    MIG-23                MIG-24      MIG-24+
```

`JwtAuthGuard` y `RolesGuard` se adelantaron a MIG-23 porque sin ellos
`register`, `me` y `change-password` no se pueden entregar funcionando (ver
[`DECISIONS.md`](./DECISIONS.md) D-12). Quedan listos para proteger `mesas`,
`productos`, `categorias`, `pedidos`, `caja`, `dashboard`, `empleados` y
`reportes` según la matriz de roles del contrato §4.

---

## 7. Tests

**Unitarios:**

- `dto/auth-dtos.spec.ts`: validaciones por DTO y contrato `422`.
- `dto/auth-response-dtos.spec.ts`: shapes de respuesta y ausencia del hash.
- `auth.service.spec.ts`: login (ok, credenciales, inactivo), registro
  (duplicado, UNIQUE race, hash), perfil, cambio de contraseña, forgot/reset con
  y sin `reset_token`, token de reseteo no intercambiable.
- `jwt.strategy.spec.ts`: payload público, `purpose`, `sub` y usuario activo.

**e2e (`test/auth.e2e-spec.ts`):** los 7 endpoints, paths con/sin barra final,
`200/201/400/401/403/422`, `{ detail }` en errores, `{ message }` en acciones y
flujo completo change-password/reset-password → login.

---

## 8. Referencias

- [`CONTRACT.md`](./CONTRACT.md) · [`DECISIONS.md`](./DECISIONS.md)
- `docs/api-contract.md` §4, §5.4, §6.1
- `src/config/auth.config.ts` — `secretKey`, `algorithm`, expiración
- `src/common/CONTRACT.md` §3 — guards y decoradores
