# Contrato — `auth`

> Extracto de [`docs/api-contract.md`](../../docs/api-contract.md) §6.1.
> Fuente formal: [`docs/openapi.yaml`](../../docs/openapi.yaml).

---

## Resumen

| Método  | Path                           | Auth    | Éxito | Errores                    |
| ------- | ------------------------------ | ------- | ----- | -------------------------- |
| `POST`  | `/api/v1/auth/login`           | público | `200` | `401`, `422`               |
| `POST`  | `/api/v1/auth/register`        | admin   | `201` | `400`, `401`, `403`, `422` |
| `GET`   | `/api/v1/auth/me`              | auth    | `200` | `401`                      |
| `PATCH` | `/api/v1/auth/me`              | auth    | `200` | `400`, `401`, `422`        |
| `POST`  | `/api/v1/auth/change-password` | auth    | `200` | `400`, `401`, `422`        |
| `POST`  | `/api/v1/auth/forgot-password` | público | `200` | `422`                      |
| `POST`  | `/api/v1/auth/reset-password`  | público | `200` | `400`, `422`               |

---

## `POST /auth/login`

```json
// request
{ "email": "admin@cafecito.com", "password": "123456" }
```

```json
// 200
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "usuario": {
    "id": 1,
    "nombre": "Nahuel Gauna",
    "email": "admin@cafecito.com",
    "rol": "admin",
    "activo": true
  }
}
```

Errores: `401` `Email o contraseña incorrectos` · `422` validación.

---

## `POST /auth/register` — admin

```json
{
  "nombre": "Valentín López",
  "email": "valentin@cafecito.com",
  "password": "123456",
  "rol": "mozo"
}
```

Éxito `201` · `Usuario`. Errores: `400` `El email ya está registrado`,
`401`, `403`, `422`.

---

## `GET /auth/me` — auth

Éxito `200` · `Usuario`. Error `401`.

---

## `PATCH /auth/me` — auth

```json
{ "nombre": "Valentín López", "email": "valentin@cafecito.com" }
```

Éxito `200` · `Usuario`. Errores: `400` `El email ya está en uso por otro
usuario`, `401`, `422`.

---

## `POST /auth/change-password` — auth

```json
// request
{ "password_actual": "123456", "password_nueva": "nuevoSecreto456" }
// 200
{ "message": "Contraseña actualizada correctamente" }
```

Errores: `400` `La contraseña actual es incorrecta`, `401`, `422`.

---

## `POST /auth/forgot-password` — público

```json
// request
{ "email": "valentin@cafecito.com" }
// 200 (development)
{
  "message": "Si el email está registrado, vas a recibir instrucciones para recuperar tu contraseña.",
  "reset_token": "eyJhbGciOi..."
}
```

En otros entornos, `reset_token` es `null` (D-15). Errores: `422`.

---

## `POST /auth/reset-password` — público

```json
// request
{ "token": "eyJhbGciOi...", "password_nueva": "nuevoSecreto456" }
// 200
{ "message": "Contraseña restablecida correctamente" }
```

Errores: `400` `Token inválido o expirado`, `422`.

---

## Tipos

```ts
type Rol = 'admin' | 'mozo';

interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
  activo: boolean;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  usuario: Usuario;
}

interface MessageResponse {
  message: string;
}

interface ForgotPasswordResponse {
  message: string;
  reset_token: string | null;
}
```

---

## Reglas transversales

- `password` y `password_hash` **nunca** se devuelven.
- `password_nueva` / `password` mínimo 6 caracteres.
- El token es HS256, expira a los 480 minutos por defecto.
- Errores de auth: `401` token/credenciales, `403` sin rol admin.
