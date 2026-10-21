# Decisiones — `users`

---

## D-01 — Un módulo dueño de la entity, sin endpoints

**Decisión:** `users` contiene la entity `Usuario` y `UsersService`; no tiene
controller.

**Motivo:** `auth` y `empleados` operan sobre la misma tabla con reglas distintas.
Un dueño único evita dos entities mapeando `usuarios` (lo que rompería TypeORM y
`schema:log`) y evita duplicar validaciones.

---

## D-02 — `empleados` no crea otra entity

**Decisión:** `empleados` consume `UsersService`.

**Motivo:** el contrato dice explícitamente que empleados opera sobre `Usuario`.
Duplicar la entity generaría dos fuentes de verdad para la misma tabla.

---

## D-03 — `password_hash` fuera del shape público

**Decisión:** el mapeo a respuesta excluye el hash; `auth` define su propio DTO.

**Motivo:** constitución §8. El shape `Usuario` del contrato tiene 5 campos y no
incluye credenciales.

---

## D-04 — Email normalizado

**Decisión:** comparar y guardar el email en minúsculas y sin espacios.

**Motivo:** el legacy no era consistente y PostgreSQL compara `varchar` de forma
sensible a mayúsculas. Sin normalizar, `Admin@x.com` y `admin@x.com` conviven y
el login falla de forma intermitente.

**Riesgo:** hay que verificar datos existentes antes de agregar un `UNIQUE`
funcional; si hay duplicados históricos, la migración falla. Revisar en MIG-44.

---

## D-05 — Sin borrado físico de usuarios

**Decisión:** desactivar (`activo = false`) en lugar de `DELETE`.

**Motivo:** los pedidos y pagos referencian al usuario. Borrarlo rompe el
historial y las FKs.

---

## D-06 — La entity se crea cuando se confirma el esquema

**Decisión:** no crear `usuario.entity.ts` hasta validar nombres y tipos reales
contra la base (MIG-44).

**Motivo:** una entity incorrecta con `synchronize` local puede alterar la tabla
compartida (constitución §4).
