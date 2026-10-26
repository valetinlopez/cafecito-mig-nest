# Módulo `users`

| Campo         | Valor                                                           |
| ------------- | --------------------------------------------------------------- |
| Estado        | **Implementado** (entity + DTOs en MIG-22; service en MIG-25)   |
| Entity        | `Usuario` → tabla `usuarios` (validar con `schema:log`, MIG-44) |
| Endpoints     | Ninguno propio (ver [`CONTRACT.md`](./CONTRACT.md))             |
| Dependencias  | `database`                                                      |
| Consumido por | `auth`, `empleados`, `pedidos`                                  |

---

## 1. Responsabilidad

Ser dueño de la entity `Usuario` y de su acceso a datos. Centraliza la
persistencia del usuario para que `auth`, `empleados` y `pedidos` no dupliquen
el repositorio ni el mapeo.

`users` **no expone endpoints**: los de identidad son de `auth` y los de gestión
de personal son de `empleados`.

---

## 2. Estado actual

```
src/users/
├── users.module.ts              # TypeOrmModule.forFeature([Usuario]) + UsersService
├── users.service.ts             # único acceso a `usuarios`
├── users.service.spec.ts
├── rol.ts                       # ROLES + tipo Rol (admin | mozo)
├── entities/
│   ├── usuario.entity.ts
│   └── usuario.entity.spec.ts
└── dto/
    ├── usuario-response.dto.ts
    └── usuario-response.dto.spec.ts
```

Implementado en MIG-22: entity, tipo `Rol`, módulo registrado y DTO de
respuesta. `UsersService` se adelantó a MIG-23 porque `auth` lo necesita para
login, perfil y reseteo (ver `auth/DECISIONS.md` D-12); queda también listo para
`empleados` (MIG-26).

---

## 3. Estructura

```
src/users/
├── users.module.ts
├── rol.ts
├── users.service.ts             # implementado (MIG-25)
├── users.service.spec.ts
├── dto/
│   └── usuario-response.dto.ts
└── entities/
    └── usuario.entity.ts
```

---

## 4. Modelo

| Propiedad      | Columna         | Tipo           | Restricción                     |
| -------------- | --------------- | -------------- | ------------------------------- |
| `id`           | `id`            | `serial`       | PK autoincremental              |
| `nombre`       | `nombre`        | `varchar(100)` | not null                        |
| `email`        | `email`         | `varchar(150)` | `UNIQUE` (`usuarios_email_key`) |
| `passwordHash` | `password_hash` | `varchar(255)` | not null, **nunca al JSON**     |
| `rol`          | `rol`           | `varchar(20)`  | `admin` \| `mozo` (tipo `Rol`)  |
| `activo`       | `activo`        | `boolean`      | default `true`                  |

> El largo de `email` es **150**, según el modelo `usuario.py` y MIG-22. La
> versión anterior de este README decía 255; se corrigió (ver `DECISIONS.md`
> D-07). Los nombres reales de tabla/columnas se validan con `schema:log` en
> MIG-44 (constitución §4).

---

## 5. API pública del módulo

`UsersService` es el único punto de acceso a `usuarios` y el módulo lo exporta.
`auth` y `empleados` lo consumen; el `Repository<Usuario>` **no** se exporta.

| Método (service)                   | Retorna                    | Uso                           |
| ---------------------------------- | -------------------------- | ----------------------------- |
| `findByEmail(email)`               | `Promise<Usuario \| null>` | Login, forgot-password        |
| `findById(id)`                     | `Promise<Usuario \| null>` | Perfil, JWT strategy, pedidos |
| `findAll()`                        | `Promise<Usuario[]>`       | Listado administrativo de empleados |
| `create(data)`                     | `Promise<Usuario>`         | Registro, empleados           |
| `update(id, data)`                 | `Promise<Usuario \| null>` | Perfil, empleados, password   |
| `existsByEmail(email, excludeId?)` | `Promise<boolean>`         | Duplicados (alta y perfil)    |

Notas de contrato interno:

- `create` recibe `passwordHash` ya calculado: el hashing es negocio de `auth`
  (D-09 de `auth`), no de la persistencia.
- `existsByEmail` acepta `excludeId` para validar un cambio de email sin chocar
  con el propio usuario.
- `findAll` resuelve el orden `nombre ASC` en PostgreSQL; no ordenar en memoria.
- `update` devuelve `null` cuando el usuario no existe; el consumidor traduce a
  `401` (auth) o `404` (empleados).
- Ningún método devuelve DTOs HTTP: el mapeo lo hace el módulo que expone el
  endpoint.

---

## 6. Reglas de negocio

- El email es único y se compara normalizado (minúsculas).
- Un usuario inactivo no puede autenticarse (`401`).
- No se puede desactivar el propio usuario (`400`), regla que aplica el módulo
  `empleados`.
- `password_hash` no se expone nunca en un DTO: `UsuarioResponseDto` no declara
  el campo y la entity lo marca `@Exclude()`.

---

## 7. Tests

**Implementados (MIG-22):**

- `usuario.entity.spec.ts`: tabla, columnas, largos, unique y autoincremento
  contra la metadata de TypeORM; `@Exclude()` oculta `password_hash`.
- `usuario-response.dto.spec.ts`: mapea los 5 campos públicos y nunca incluye el
  hash.

**Implementados (MIG-25, dentro del PR de MIG-23):**

- `users.service.spec.ts`: normalización de email en búsqueda, alta y edición;
  `existsByEmail` con y sin `excludeId`; `update` aplica solo los campos
  presentes y devuelve `null` si el usuario no existe.

---

## 8. Referencias

- [`CONTRACT.md`](./CONTRACT.md) · [`DECISIONS.md`](./DECISIONS.md)
- `docs/api-contract.md` §7 (schemas) y §6.1/§6.8 (endpoints que lo consumen)
- `docs/architecture.md` §6 (dependencias)
