# Decisiones — `empleados`

---

## D-01 — Empleado = `Usuario` con `rol = mozo`

**Decisión:** no crear tabla ni entity `Empleado`.

**Motivo:** el legacy y el contrato usan la misma entidad. Una tabla paralela
duplicaría credenciales y rompería el login único.

---

## D-02 — El rol no se elige ni se cambia desde empleados

**Decisión:** el alta fuerza `mozo`; `EmpleadoUpdate` no acepta `rol`.

**Motivo:** el contrato lo prohíbe explícitamente. El cambio de rol es una
operación administrativa que no existe en el legacy; si se necesita, va por
`auth/register` (admin) o un ticket nuevo.

**Riesgo:** si el body trae `rol`, debe ignorarse o rechazarse. Se recomienda
`forbidNonWhitelisted: false` (D-03 del contrato) e ignorar el campo, para no
romper clientes que lo envíen.

**Implementado (MIG-22):** `CreateEmpleadoDto` y `UpdateEmpleadoDto` no declaran
`rol`. Con `whitelist: true`, el `ValidationPipe` global lo elimina antes de
llegar al service. `empleado-dtos.spec.ts` lo verifica con el pipe real.

---

## D-03 — Baja lógica

**Decisión:** `activo = false`, sin `DELETE`.

**Motivo:** pedidos y pagos referencian al usuario. Borrarlo rompe el historial.

---

## D-04 — No desactivarse a sí mismo

**Decisión:** el service compara el `id` del token con el `id` del path y
responde `400` `No podés desactivar tu propio usuario`.

**Motivo:** evita que un admin se deje fuera del sistema. Es una regla de negocio,
no una validación de DTO.

---

## D-05 — Consumir `UsersService`, no el repositorio

**Decisión:** `EmpleadosService` inyecta `UsersService`; el hash se calcula
con bcrypt en `EmpleadosService` y `UsersService.create()` recibe únicamente
`passwordHash`.

**Motivo:** `users` es dueño de la persistencia, normalización de email y
consulta de unicidad. El hashing es responsabilidad del módulo que recibe el
password en claro; mantener el contrato actual de `UsersService.create()` evita
ampliar el alcance de MIG-26 y cualquier duplicación del repositorio.

---

## D-06 — Orden de la lista

**Decisión:** ordenar por `nombre ASC` en la consulta de `UsersService`.

**Motivo:** la UI muestra una tabla de personal; un orden estable evita saltos
entre renders. El usuario confirmó mantener el criterio documentado.

---

## D-07 — DTOs de entrada propios, response de `users`

**Decisión:** `empleados` define `CreateEmpleadoDto` y `UpdateEmpleadoDto`
(MIG-22) y reutiliza `UsuarioResponseDto` de `users` para las respuestas.

**Motivo:** los tres endpoints devuelven el schema `Usuario` del contrato, no un
`Empleado`. Duplicar el DTO de response crearía dos shapes que podrían
divergir; el de `users` ya garantiza que `password_hash` no salga.
