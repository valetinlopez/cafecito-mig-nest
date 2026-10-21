# Contrato — `users`

> `users` **no expone endpoints HTTP propios**. Su contrato es interno: la entity
> y el shape público de usuario que consumen otros módulos.

---

## 1. Endpoints

Ninguno. Los endpoints que devuelven usuarios pertenecen a:

| Endpoint                       | Módulo      | Devuelve    |
| ------------------------------ | ----------- | ----------- |
| `POST /api/v1/auth/register`   | `auth`      | `Usuario`   |
| `GET /api/v1/auth/me`          | `auth`      | `Usuario`   |
| `PATCH /api/v1/auth/me`        | `auth`      | `Usuario`   |
| `GET /api/v1/empleados/`       | `empleados` | `Usuario[]` |
| `POST /api/v1/empleados/`      | `empleados` | `Usuario`   |
| `PATCH /api/v1/empleados/{id}` | `empleados` | `Usuario`   |

`pedidos` devuelve un `Usuario` anidado dentro de cada pedido.

---

## 2. Shape público (`Usuario`)

```ts
type Rol = 'admin' | 'mozo';

interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
  activo: boolean;
}
```

**Nunca** incluye `password`, `password_hash` ni columnas internas.

---

## 3. Contrato del service (interno)

```ts
class UsersService {
  findByEmail(email: string): Promise<Usuario | null>;
  findById(id: number): Promise<Usuario | null>;
  create(data: CreateUsuarioData): Promise<Usuario>;
  update(id: number, data: UpdateUsuarioData): Promise<Usuario>;
  existsByEmail(email: string): Promise<boolean>;
}
```

Los métodos pueden ajustarse al implementar, pero:

- Devuelven entities o tipos de dominio, **no DTOs HTTP**.
- El mapeo al shape público lo hace el módulo que expone el endpoint.
- Ningún consumidor accede al repositorio de `usuarios` por fuera de este service.

---

## 4. Invariantes

| Invariante                         | Verificación                       |
| ---------------------------------- | ---------------------------------- |
| `email` único                      | `UNIQUE` en base + `existsByEmail` |
| `rol` ∈ `{admin, mozo}`            | validación + tipo                  |
| `activo` boolean, default `true`   | columna con default                |
| `password_hash` nunca en respuesta | DTO `fromEntity()`                 |
