# Decisiones — `auth`

---

## D-01 — JWT HS256 con expiración de 480 minutos

**Decisión:** firmar con `SECRET_KEY`, algoritmo configurable (`HS256` por
defecto) y `ACCESS_TOKEN_EXPIRE_MINUTES=480`.

**Motivo:** replica el esquema del legacy (D-08) y el front ya inyecta el header
`Authorization: Bearer`. Cambiar el algoritmo o la expiración rompe sesiones
existentes.

---

## D-02 — El hash de password nunca cruza el borde HTTP

**Decisión:** `UsuarioResponseDto` con `fromEntity()` que excluye
`password_hash`.

**Motivo:** constitución §8. Aunque el legacy no lo filtraba, exponer el hash es
un riesgo innecesario.

---

## D-03 — `bcrypt` para hashing

**Decisión:** `bcrypt` (ya en dependencias) con costo por defecto.

**Motivo:** es el mismo algoritmo que usa el legacy, así los usuarios migrados
pueden iniciar sesión sin resetear contraseña.

---

## D-04 — `reset_token` solo en desarrollo

**Decisión:** el response de `forgot-password` incluye `reset_token` cuando
`NODE_ENV=development`; en el resto, `null`.

**Motivo:** no hay servicio de email. En producción se evita filtrar un token
que permitiría tomar la cuenta.

**Riesgo:** el front tipa el campo como `string | null`; no asumir que siempre
viene.

---

## D-05 — Mensajes de error exactos

**Decisión:** reutilizar los strings del contrato: `Email o contraseña
incorrectos`, `Usuario no encontrado o inactivo`, `Token inválido o expirado`,
`Se requiere rol de administrador`.

**Motivo:** el front muestra `detail` tal cual y algunos flujos comparan el
texto. Cambiarlo es un cambio de contrato.

---

## D-06 — No hay refresh token en S0

**Decisión:** solo access token de 480 minutos.

**Motivo:** el legacy no lo tenía y el front no lo maneja. Queda como decisión
abierta en `.agents/memory.md`.

---

## D-07 — El registro público no existe

**Decisión:** `POST /auth/register` requiere rol `admin`.

**Motivo:** es un alta administrativa, no un signup. El contrato lo marca `admin`
y el legacy también.

---

## D-08 — Guard global todavía pendiente

**Decisión:** no aplicar un `APP_GUARD` global en el mismo ticket de auth.

**Motivo:** primero deben existir `JwtAuthGuard` y `RolesGuard` estables
(MIG-24). Aplicar un guard global antes de definir las rutas públicas
(`/auth/login`, `/auth/forgot-password`, `/auth/reset-password`, `GET /`) dejaría
el sistema inaccesible.

**Plan:** guard por controller con `@Public()` explícito para las excepciones.

---

## D-09 — Bcrypt y `pg` no se tocan desde el controller

**Decisión:** hashing y verificación viven en `AuthService`.

**Motivo:** constitución §3. El controller solo traduce HTTP.

---

## D-10 — DTOs replican los schemas del legacy, en `snake_case`

**Decisión:** cada operación tiene su DTO en `src/auth/dto/` con los campos y
validaciones del schema `usuario.py`. Los mensajes de error no se escriben en
el DTO: los traduce `src/common/pipes/validation-messages.ts`.

**Motivo:** el contrato congela `password_actual`, `password_nueva` y
`reset_token` en `snake_case` (D-13). Duplicar traducciones en cada DTO
desincroniza los `422`; el pipe global ya garantiza el formato
`Campo '<campo>': <mensaje>` (ADR 0001).

**Alcance MIG-22:** solo DTOs y tests. `TokenResponseDto` y el controller llegan
con MIG-23.

---

## D-11 — El login no exige mínimo de 6

**Decisión:** `LoginDto.password` solo valida `@IsString()`; el mínimo de 6 se
aplica en `RegisterDto`, `ChangePasswordDto`, `ResetPasswordDto` y
`CreateEmpleadoDto`.

**Motivo:** el login debe aceptar la contraseña que el usuario tenga guardada,
incluidas las de usuarios migrados del legacy. Validar longitud en el login
transformaría un `401` de credenciales en un `422` engañoso y podría bloquear
cuentas existentes.
