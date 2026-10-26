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

## D-06 — La entity nace del modelo legacy y se valida con `schema:log`

**Decisión:** crear `usuario.entity.ts` en MIG-22 a partir del modelo
`usuario.py` y de la tabla de columnas del ticket, y validar el mapeo contra la
base con `npm run schema:log` en MIG-44 antes de habilitar `synchronize` local.

**Motivo:** MIG-22 es la base bloqueante de `auth`/`empleados`; sin entity no se
puede avanzar. El riesgo de una entity incorrecta se controla con la validación
posterior, no postergando el ticket. `synchronize` sigue apagado salvo dev +
host local (`database.config.ts`).

**Riesgo:** si `schema:log` reporta diferencias, se corrigen acá y se documenta;
no se ejecuta `synchronize` contra Neon.

---

## D-07 — `email` es `varchar(150)`

**Decisión:** mapear `email` como `varchar(150)`, no 255.

**Motivo:** el modelo legacy (`usuario.py`) y la tabla de columnas de MIG-22
declaran 150. El README de `users` decía 255 por inferencia; se corrigió.

**Verificación:** `usuario.entity.spec.ts` fija el largo y MIG-44 lo compara
contra PostgreSQL.

---

## D-08 — Nombres de DTO alineados al módulo

**Decisión:** usar `RegisterDto`, `UpdateProfileDto`, `CreateEmpleadoDto`,
`UpdateEmpleadoDto` y `UsuarioResponseDto`.

**Motivo:** el ticket MIG-22 los nombra `CreateUserDto`, `UpdateUserProfileDto`,
`EmpleadoCreateDto`, `EmpleadoUpdateDto` y `UserResponseDto`. El repositorio
nombra por operación (`auth/README.md` §3), por recurso en español
(`empleados`) y por entity (`<Entity>ResponseDto`, como `CategoriaResponseDto`).
Los campos, validaciones y shapes son idénticos; solo cambia el identificador
interno de la clase, que no cruza el contrato HTTP.

---

## D-09 — Doble barrera para `password_hash`

**Decisión:** el hash no existe en `UsuarioResponseDto` y la columna de la
entity lleva `@Exclude()`.

**Motivo:** constitución §8. El DTO es la garantía real porque el borde HTTP
nunca serializa entities; `@Exclude()` cubre el caso de una serialización
accidental con `class-transformer`.

**Verificación:** ambos specs comprueban que el hash no aparece en el JSON.

---

## D-10 — `Rol` como unión literal centralizada

**Decisión:** `rol.ts` exporta `ROLES` y `type Rol = 'admin' | 'mozo'`; el DTO lo
usa con `@IsIn(ROLES)` y Swagger con `enum`.

**Motivo:** constitución §10 (nada de `string` libre) y una sola fuente de
verdad para validación, documentación y tests. La columna sigue siendo
`varchar(20)`, sin `enum` de PostgreSQL: cambiar el tipo alteraría una tabla
compartida con producción.

---

## D-11 — `@MaxLength` refleja el largo de la columna

**Decisión:** `nombre` valida 100 y `email` 150 en todos los DTOs de entrada.

**Motivo:** PostgreSQL rechaza el excedente con un error de query (`500` vía
filtro global). Validarlo antes devuelve `422` con el formato del contrato. No
es una restricción nueva: el dato tampoco entraba antes.

---

## D-12 — Semántica del service para consumidores distintos

**Decisión:** `existsByEmail(email, excludeId?)` excluye al propio usuario del
chequeo y `update(id, data)` devuelve `null` cuando la fila no existe.

**Motivo:** `auth` y `empleados` necesitan el mismo acceso a datos con
respuestas HTTP distintas. Devolver `null` (en lugar de lanzar `404`) deja que
cada módulo decida: `auth` responde `401 Usuario no encontrado o inactivo` y
`empleados` responderá `404 Empleado no encontrado` (MIG-26). Un `400`/`404`
hardcodeado en `users` acoplaría la persistencia al contrato de otro módulo.

**Verificación:** `users.service.spec.ts` cubre el `null` y el `excludeId`.
