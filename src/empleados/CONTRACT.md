# Contrato — `empleados`

> Extracto de [`docs/api-contract.md`](../../docs/api-contract.md) §6.8.

Todos los endpoints requieren **`admin`**.

---

## Resumen

| Método  | Path                     | Éxito               | Errores                           |
| ------- | ------------------------ | ------------------- | --------------------------------- |
| `GET`   | `/api/v1/empleados/`     | `200` · `Usuario[]` | `401`, `403`                      |
| `POST`  | `/api/v1/empleados/`     | `201` · `Usuario`   | `400`, `401`, `403`, `422`        |
| `PATCH` | `/api/v1/empleados/{id}` | `200` · `Usuario`   | `400`, `401`, `403`, `404`, `422` |

---

## `GET /api/v1/empleados/`

Devuelve todos los usuarios (empleados y admins), ordenados por `nombre ASC`.

```json
[
  {
    "id": 2,
    "nombre": "Valentín",
    "email": "valentin@example.com",
    "rol": "mozo",
    "activo": true
  }
]
```

Errores: `401`, `403` `Se requiere rol de administrador`.

---

## `POST /api/v1/empleados/`

```json
{
  "nombre": "Valentín",
  "email": "valentin@example.com",
  "password": "secreto123"
}
```

Éxito `201` · `Usuario`. El rol resultante es **siempre** `mozo`.

Errores: `400` `El email ya está registrado`, `401`, `403`, `422`.

---

## `PATCH /api/v1/empleados/{id}`

```json
{ "activo": false }
```

Campos permitidos: `nombre`, `email`, `activo`.

Éxito `200` · `Usuario`.

Errores:

| Código | `detail`                                   |
| ------ | ------------------------------------------ |
| `400`  | `El email ya está en uso por otro usuario` |
| `400`  | `No podés desactivar tu propio usuario`    |
| `404`  | `Empleado no encontrado`                   |
| `422`  | Validación                                 |

---

## Tipos

```ts
interface EmpleadoCreate {
  nombre: string;
  email: string;
  password: string; // min 6
}

interface EmpleadoUpdate {
  nombre?: string;
  email?: string;
  activo?: boolean;
}
```

La respuesta es el shape `Usuario` de `users` (`id`, `nombre`, `email`, `rol`,
`activo`) sin `password`.
