# Módulo `users`

| Campo         | Valor                                                           |
| ------------- | --------------------------------------------------------------- |
| Estado        | **Implementado parcial** (entity + DTOs; service en MIG-25)     |
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
├── users.module.ts              # TypeOrmModule.forFeature([Usuario])
├── rol.ts                       # ROLES + tipo Rol (admin | mozo)
├── entities/
│   ├── usuario.entity.ts
│   └── usuario.entity.spec.ts
└── dto/
    ├── usuario-response.dto.ts
    └── usuario-response.dto.spec.ts
```

Implementado en MIG-22: entity, tipo `Rol`, módulo registrado y DTO de
respuesta. **Falta `UsersService`** (MIG-25), que es el único punto de acceso a
datos para `auth` y `empleados`.

---

## 3. Estructura

```
src/users/
├── users.module.ts
├── rol.ts
├── users.service.ts             # MIG-25
├── users.service.spec.ts        # MIG-25
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

> **Objetivo de MIG-25.** `UsersService` todavía no existe; hoy el módulo solo
> expone la entity y el DTO de respuesta.

| Método (service)       | Retorna                    | Uso                      |
| ---------------------- | -------------------------- | ------------------------ |
| `findByEmail(email)`   | `Promise<Usuario \| null>` | Login                    |
| `findById(id)`         | `Promise<Usuario \| null>` | Perfil, pedidos          |
| `create(data)`         | `Promise<Usuario>`         | Registro, empleados      |
| `update(id, data)`     | `Promise<Usuario>`         | Perfil, empleados        |
| `existsByEmail(email)` | `Promise<boolean>`         | Validación de duplicados |

El detalle final se define al implementar; lo importante es que `auth` y
`empleados` consuman `UsersService` y no el repositorio directo. El módulo
**no exporta** `TypeOrmModule` a propósito.

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

**Pendientes (MIG-25):**

- `findByEmail` devuelve el usuario correcto y `null` si no existe.
- `existsByEmail` distingue mayúsculas/minúsculas.
- Normalización del email al crear y actualizar.

---

## 8. Referencias

- [`CONTRACT.md`](./CONTRACT.md) · [`DECISIONS.md`](./DECISIONS.md)
- `docs/api-contract.md` §7 (schemas) y §6.1/§6.8 (endpoints que lo consumen)
- `docs/architecture.md` §6 (dependencias)
