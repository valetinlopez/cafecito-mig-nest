# Decisiones — `categorias`

Decisiones locales del módulo. Las transversales están en
[`docs/adr/`](../../docs/adr/README.md).

---

## D-01 — El orden se resuelve en la base

**Decisión:** `find({ order: { nombre: 'ASC' } })`, nunca `.sort()` en memoria.

**Motivo:** el resultado debe ser estable con cualquier volumen y aprovechar el
índice. Es la regla general de la constitución §3 y convenciones §6.3.

---

## D-02 — Nunca se serializa la entity

**Decisión:** el service devuelve `CategoriaResponseDto` construido con
`fromEntity()`.

**Motivo:** congela el contrato (`{ id, nombre }`) y evita filtrar columnas
internas si la tabla crece (constitución §8).

---

## D-03 — Sin barrels dentro del feature module

**Decisión:** los imports van al archivo concreto
(`./entities/categoria.entity.js`).

**Motivo:** un `index.ts` que reexporta entities genera ciclos
`Categoria → Producto → Categoria`, y TypeORM los resuelve mal
(convenciones §3).

---

## D-04 — Restricción `UNIQUE` con nombre explícito

**Decisión:** `@Unique('categorias_nombre_key', ['nombre'])`.

**Motivo:** es el nombre que PostgreSQL generó al crear la tabla desde el legacy.
Sin el nombre explícito, TypeORM genera `UQ_<hash>` y `schema:log` (MIG-44)
propone recrear la restricción.

---

## D-05 — La relación con `Producto` se declara después

**Decisión:** no declarar `@OneToMany` hasta que exista la entity `Producto`.

**Motivo:** una entity parcial sobre la base compartida puede hacer que
`synchronize` altere columnas reales en desarrollo. Se agrega en MIG-29.

---

## D-06 — El guard JWT todavía no está aplicado

**Decisión:** el controller declara `@ApiBearerAuth()` y documenta `401`, pero no
tiene guard hasta que exista la infraestructura de auth.

**Motivo:** el `JwtAuthGuard` llega en MIG-24. Declarar un guard inexistente
rompería el build; omitir la documentación rompería el contrato.

**Riesgo:** el endpoint está **sin protección** hasta MIG-24. Aceptado como deuda
de S0 y registrado en `.agents/memory.md`.

---

## D-07 — Solo lectura

**Decisión:** no se implementan `POST`, `PATCH` ni `DELETE`.

**Motivo:** el legacy no los tenía y el contrato no los define. Agregarlos sería
un rediseño fuera de alcance (constitución §2).

---

## Pendientes

| Tema                         | Ticket |
| ---------------------------- | ------ |
| Aplicar `JwtAuthGuard`       | MIG-24 |
| `@OneToMany(() => Producto)` | MIG-29 |
| Validar esquema real         | MIG-44 |
