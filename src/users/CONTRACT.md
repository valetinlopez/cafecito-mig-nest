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

---

## 5. DTOs

La entity y el shape público son de `users`; los DTOs de entrada viven en el
módulo que expone el endpoint (MIG-22). Todos usan `class-validator` y el
`ValidationPipe` global responde **422** (`Campo '<campo>': mensaje`).

| DTO                  | Archivo                                | Campos                            | Validaciones clave                         |
| -------------------- | -------------------------------------- | --------------------------------- | ------------------------------------------ |
| `UsuarioResponseDto` | `users/dto/usuario-response.dto.ts`    | `id, nombre, email, rol, activo`  | `fromEntity()`; nunca incluye el hash      |
| `LoginDto`           | `auth/dto/login.dto.ts`                | `email, password`                 | `@IsEmail`, `@IsString` (sin mínimo)       |
| `RegisterDto`        | `auth/dto/register.dto.ts`             | `nombre, email, password, rol`    | `@MinLength(6)`, `@IsIn(ROLES)`            |
| `UpdateProfileDto`   | `auth/dto/update-profile.dto.ts`       | `nombre?, email?`                 | `@IsOptional`; descarta `rol`              |
| `ChangePasswordDto`  | `auth/dto/change-password.dto.ts`      | `password_actual, password_nueva` | `@MinLength(6)` solo en la nueva           |
| `ForgotPasswordDto`  | `auth/dto/forgot-password.dto.ts`      | `email`                           | `@IsEmail`                                 |
| `ResetPasswordDto`   | `auth/dto/reset-password.dto.ts`       | `token, password_nueva`           | `@MinLength(6)` en la nueva                |
| `CreateEmpleadoDto`  | `empleados/dto/create-empleado.dto.ts` | `nombre, email, password`         | sin `rol` (CFB-112); `@MinLength(6)`       |
| `UpdateEmpleadoDto`  | `empleados/dto/update-empleado.dto.ts` | `nombre?, email?, activo?`        | sin `rol`; baja lógica con `activo: false` |

`nombre` y `email` validan `@MaxLength(100)` y `@MaxLength(150)`
respectivamente: reflejan el largo real de la columna para devolver `422` en
lugar de un `500` de PostgreSQL. No agregan restricciones al contrato: un valor
más largo tampoco se podía persistir antes.

> Nombres de DTO: el ticket MIG-22 usa `CreateUserDto`, `UpdateUserProfileDto`,
> `EmpleadoCreateDto`, `EmpleadoUpdateDto` y `UserResponseDto`. En el código se
> usan los nombres alineados al directorio del módulo (`register.dto.ts`,
> `create-empleado.dto.ts`, `usuario-response.dto.ts`). El mapeo campo a campo
> es idéntico; ver `DECISIONS.md` D-08.
