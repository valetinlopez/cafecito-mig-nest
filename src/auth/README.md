# Módulo `auth`

| Campo        | Valor                                                    |
| ------------ | -------------------------------------------------------- |
| Estado       | **Scaffold** (módulo registrado, sin controller/service) |
| Endpoints    | 7 (ver [`CONTRACT.md`](./CONTRACT.md))                   |
| Dependencias | `users` (entity `Usuario`), `config/auth`                |
| Tests        | Pendientes (llegan con la implementación)                |

---

## 1. Responsabilidad

Autenticación y gestión de la identidad: login con JWT, registro de usuarios
(solo admin), perfil propio, cambio y recuperación de contraseña.

El módulo es dueño del **borde de seguridad**: emite el token, valida
credenciales y expone el usuario autenticado. La entity `Usuario` y su acceso a
datos viven en `users`; `auth` los consume.

---

## 2. Estado actual

```
src/auth/
└── auth.module.ts     # @Module({}) — vacío
```

No hay controller, service, DTOs, guards ni estrategia Passport. **Ningún
endpoint de auth está disponible todavía.**

---

## 3. Estructura objetivo

```
src/auth/
├── auth.module.ts
├── auth.controller.ts
├── auth.service.ts
├── auth.service.spec.ts
├── dto/
│   ├── login.dto.ts
│   ├── register.dto.ts
│   ├── update-profile.dto.ts
│   ├── change-password.dto.ts
│   ├── forgot-password.dto.ts
│   ├── reset-password.dto.ts
│   └── token-response.dto.ts
├── strategies/
│   └── jwt.strategy.ts
├── guards/               # o en src/common/guards
│   └── jwt-auth.guard.ts
└── README.md · CONTRACT.md · DECISIONS.md
```

---

## 4. Piezas a implementar

| Pieza                     | Responsabilidad                                         |
| ------------------------- | ------------------------------------------------------- |
| `AuthController`          | Los 7 endpoints de [`CONTRACT.md`](./CONTRACT.md).      |
| `AuthService`             | Validar credenciales, hashear, firmar/verificar tokens. |
| `JwtStrategy`             | Extraer y validar el Bearer token; adjuntar el usuario. |
| `JwtAuthGuard`            | Proteger rutas `auth`.                                  |
| `RolesGuard` + `@Roles()` | Restringir a `admin` (registro).                        |
| DTOs                      | Contrato de entrada/salida, con `snake_case`.           |

---

## 5. Reglas de negocio

- Login inválido → `401` `Email o contraseña incorrectos`.
- Usuario inactivo → `401` `Usuario no encontrado o inactivo`.
- Email duplicado en registro → `400` `El email ya está registrado`.
- Cambio de contraseña con actual incorrecta → `400` `La contraseña actual es incorrecta`.
- Token de reset inválido o expirado → `400` `Token inválido o expirado`.
- `password_nueva` mínimo 6 caracteres → `422` si no cumple.
- `reset_token` se devuelve **solo** en `development` (D-15); en el resto, `null`.

---

## 6. Dependencias y orden de implementación

```
users (entity Usuario)  →  auth (login/JWT)  →  guards en common  →  proteger módulos
        MIG-22                 MIG-23               MIG-24              MIG-24+
```

El guard es transversal: una vez creado, se aplica a `mesas`, `productos`,
`categorias`, `pedidos`, `caja`, `dashboard`, `empleados` y `reportes` según la
matriz de roles del contrato §4.

---

## 7. Tests esperados

- Login OK devuelve `access_token`, `token_type: "bearer"` y `usuario`.
- Login con password incorrecta → `401`.
- Login con usuario inactivo → `401`.
- Registro con email duplicado → `400`.
- `GET /auth/me` sin token → `401`.
- e2e de cambio de contraseña y reset.

---

## 8. Referencias

- [`CONTRACT.md`](./CONTRACT.md) · [`DECISIONS.md`](./DECISIONS.md)
- `docs/api-contract.md` §4, §5.4, §6.1
- `src/config/auth.config.ts` — `secretKey`, `algorithm`, expiración
