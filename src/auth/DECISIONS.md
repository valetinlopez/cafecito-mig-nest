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

---

## D-12 — Guards y `UsersService` se adelantan a MIG-23

**Decisión:** el PR de MIG-23 incluye `UsersService` (previsto para MIG-25) y
`JwtAuthGuard`/`RolesGuard`/`@Public()`/`@Roles()`/`@CurrentUser()` (previstos
para MIG-24).

**Motivo:** el criterio de aceptación del ticket es que **los 7 endpoints
funcionen** con sus códigos y mensajes. Sin service no hay login, y sin guards
`register`, `me` y `change-password` quedarían públicos o sin rol. Entregar el
controller con mocks habría dejado el ticket abierto y trasladado la deuda.

**Alcance:** `empleados` (MIG-26) no se toca. Los guards quedan genéricos en
`common` para que MIG-24 solo los aplique al resto de los módulos y agregue sus
e2e de `401`/`403`.

---

## D-13 — Guard por controller, no `APP_GUARD` global

**Decisión:** `AuthController` declara
`@UseGuards(JwtAuthGuard, RolesGuard)` y marca con `@Public()` las tres rutas
abiertas (`login`, `forgot-password`, `reset-password`).

**Motivo:** un guard global exige auditar antes todas las rutas públicas
(incluido `GET /`); un olvido deja el sistema inaccesible. La excepción queda
declarada junto al endpoint y el guard se reutiliza sin configuración extra.

---

## D-14 — El access token no transporta datos del usuario

**Decisión:** el payload es `{ sub, rol }` (fijado por el epic MIG-4).
`JwtStrategy` relee la fila en cada request y devuelve el shape público.

**Motivo:** un token de 480 minutos con nombre/email/rol quedaría desactualizado
hasta su expiración. Releer la base hace que una baja o un cambio de rol apliquen
al instante, y permite responder `401 Usuario no encontrado o inactivo` sin
esperar al refresh.

**Costo:** una query por request autenticado; se acepta por ser una lectura por
PK y por la corrección del comportamiento.

---

## D-15 — Reset token con `purpose` y 15 minutos

**Decisión:** el token de reseteo se firma con el mismo `SECRET_KEY` pero con
`purpose = password_reset` y `expiresIn: 900` segundos.

**Motivo:** criterio del epic MIG-4: los reset tokens **no** son intercambiables
con access tokens. `JwtStrategy` rechaza cualquier payload con `purpose`
(401) y `resetPassword` exige `purpose = password_reset` (400).

---

## D-16 — Orden de verificación en el login

**Decisión:** primero se busca el usuario, después se compara la contraseña y
recién al final se evalúa `activo`.

**Motivo:** un email inexistente y una contraseña incorrecta responden el mismo
`401 Email o contraseña incorrectos`, sin filtrar qué cuentas existen. El
mensaje `Usuario no encontrado o inactivo` solo aparece cuando la contraseña ya
es correcta, igual que el contrato §5.4.

---

## D-17 — Mensajes del borde de seguridad centralizados

**Decisión:** los literales viven en `auth/auth-messages.ts` (negocio) y
`common/auth/auth-messages.ts` (guards y estrategia). Ningún string del contrato
se repite en el código.

**Motivo:** el front muestra `detail` tal cual y algunos flujos comparan el
texto. Una copia desactualizada cambia el contrato en silencio.
