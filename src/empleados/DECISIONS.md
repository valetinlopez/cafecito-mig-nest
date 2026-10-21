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

**Decisión:** `EmpleadosService` inyecta `UsersService`.

**Motivo:** el hash de password, la normalización de email y la unicidad deben
vivir en un solo lugar (`users`). Duplicarlos genera inconsistencias entre alta
desde auth y alta desde empleados.

---

## D-06 — Orden de la lista

**Decisión:** ordenar por `nombre ASC` (a confirmar con el legacy).

**Motivo:** la UI muestra una tabla de personal; un orden estable evita saltos
entre renders. Si el legacy ordena por `id`, se ajusta al implementar y se
actualiza este documento.
