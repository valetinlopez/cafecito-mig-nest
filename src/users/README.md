# Módulo `users`

| Campo         | Valor                                               |
| ------------- | --------------------------------------------------- |
| Estado        | **Scaffold** (módulo registrado, sin código propio) |
| Entity        | `Usuario` → tabla `usuarios` (por confirmar)        |
| Endpoints     | Ninguno propio (ver [`CONTRACT.md`](./CONTRACT.md)) |
| Dependencias  | `database`                                          |
| Consumido por | `auth`, `empleados`, `pedidos`                      |

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
└── users.module.ts    # @Module({}) — vacío
```

Sin entity, service, controller ni tests.

---

## 3. Estructura objetivo

```
src/users/
├── users.module.ts
├── users.service.ts
├── users.service.spec.ts
├── dto/
│   └── usuario-response.dto.ts
├── entities/
│   └── usuario.entity.ts
├── README.md · CONTRACT.md · DECISIONS.md
```

---

## 4. Modelo esperado

| Propiedad      | Columna         | Tipo           | Restricción                 |
| -------------- | --------------- | -------------- | --------------------------- |
| `id`           | `id`            | `serial`       | PK autoincremental          |
| `nombre`       | `nombre`        | `varchar(100)` | not null                    |
| `email`        | `email`         | `varchar(255)` | `UNIQUE`, not null          |
| `passwordHash` | `password_hash` | `varchar(255)` | not null, **nunca al JSON** |
| `rol`          | `rol`           | `varchar`/enum | `admin` \| `mozo`           |
| `activo`       | `activo`        | `boolean`      | default `true`              |

> Los tipos y nombres exactos se confirman contra la base en MIG-44 antes de
> crear la entity (constitución §4).

---

## 5. API pública del módulo

| Método (service)       | Retorna                    | Uso                      |
| ---------------------- | -------------------------- | ------------------------ |
| `findByEmail(email)`   | `Promise<Usuario \| null>` | Login                    |
| `findById(id)`         | `Promise<Usuario \| null>` | Perfil, pedidos          |
| `create(data)`         | `Promise<Usuario>`         | Registro, empleados      |
| `update(id, data)`     | `Promise<Usuario>`         | Perfil, empleados        |
| `existsByEmail(email)` | `Promise<boolean>`         | Validación de duplicados |

El detalle final se define al implementar; lo importante es que `auth` y
`empleados` consuman `UsersService` y no el repositorio directo.

---

## 6. Reglas de negocio

- El email es único y se compara normalizado (minúsculas).
- Un usuario inactivo no puede autenticarse (`401`).
- No se puede desactivar el propio usuario (`400`), regla que aplica el módulo
  `empleados`.
- `password_hash` no se expone nunca en un DTO.

---

## 7. Tests esperados

- `findByEmail` devuelve el usuario correcto y `null` si no existe.
- `existsByEmail` distingue mayúsculas/minúsculas.
- El DTO de response no incluye `password_hash`.

---

## 8. Referencias

- [`CONTRACT.md`](./CONTRACT.md) · [`DECISIONS.md`](./DECISIONS.md)
- `docs/api-contract.md` §7 (schemas) y §6.1/§6.8 (endpoints que lo consumen)
- `docs/architecture.md` §6 (dependencias)
