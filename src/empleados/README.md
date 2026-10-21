# Módulo `empleados`

| Campo        | Valor                                               |
| ------------ | --------------------------------------------------- |
| Estado       | **Scaffold** (módulo registrado, sin código propio) |
| Entity       | `Usuario` (compartida con `users`)                  |
| Endpoints    | 3 (ver [`CONTRACT.md`](./CONTRACT.md))              |
| Dependencias | `users`                                             |
| Tests        | Pendientes                                          |

---

## 1. Responsabilidad

Gestión administrativa del personal: listar, crear y actualizar empleados. Un
empleado **es** un `Usuario` con `rol = mozo`; no existe una tabla separada.

El alta siempre crea `rol = mozo`: desde estos endpoints no se puede elegir ni
cambiar el rol.

---

## 2. Estado actual

```
src/empleados/
└── empleados.module.ts    # @Module({}) — vacío
```

---

## 3. Estructura objetivo

```
src/empleados/
├── empleados.module.ts
├── empleados.controller.ts
├── empleados.service.ts
├── empleados.service.spec.ts
├── dto/
│   ├── create-empleado.dto.ts
│   ├── update-empleado.dto.ts
│   └── empleado-response.dto.ts
├── README.md · CONTRACT.md · DECISIONS.md
```

Sin `entities/`: la entity vive en `users`.

---

## 4. Reglas de negocio

- Crear: `rol` forzado a `mozo`, `activo` en `true`, password hasheado con bcrypt.
- Actualizar: solo `nombre`, `email` y `activo`. El rol no se modifica.
- Email duplicado → `400` `El email ya está registrado` (alta) o
  `El email ya está en uso por otro usuario` (edición).
- No se puede desactivar el propio usuario → `400`
  `No podés desactivar tu propio usuario`.
- Empleado inexistente → `404` `Empleado no encontrado`.
- Todos los endpoints requieren rol `admin`.

---

## 5. Dependencias

```
users (entity + service)  →  empleados (controller + reglas de personal)
```

`EmpleadosService` debe inyectar `UsersService`, no el repositorio de usuarios.

---

## 6. Tests esperados

- Lista de empleados ordenada (definir criterio: nombre o id) y mapeo a DTO.
- Alta fuerza `rol = mozo` aunque el body no lo incluya.
- Alta con email duplicado → `400`.
- Baja lógica: `PATCH { activo: false }` devuelve el usuario actualizado.
- Desactivarse a sí mismo → `400`.
- e2e de `403` con token de mozo.

---

## 7. Referencias

- [`CONTRACT.md`](./CONTRACT.md) · [`DECISIONS.md`](./DECISIONS.md)
- `docs/api-contract.md` §6.8
- `src/users/README.md`
