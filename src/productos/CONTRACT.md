# Contrato — `productos`

> Extracto de [`docs/api-contract.md`](../../docs/api-contract.md) §6.3.

---

## Resumen

| Método   | Path                     | Auth  | Éxito                | Errores                           |
| -------- | ------------------------ | ----- | -------------------- | --------------------------------- |
| `GET`    | `/api/v1/productos/`     | auth  | `200` · `Producto[]` | `401`                             |
| `GET`    | `/api/v1/productos/{id}` | auth  | `200` · `Producto`   | `401`, `404`                      |
| `POST`   | `/api/v1/productos/`     | admin | `201` · `Producto`   | `400`, `401`, `403`, `422`        |
| `PATCH`  | `/api/v1/productos/{id}` | admin | `200` · `Producto`   | `400`, `401`, `403`, `404`, `422` |
| `DELETE` | `/api/v1/productos/{id}` | admin | `204` sin body       | `400`, `401`, `403`, `404`        |

---

## Tipos

```ts
interface Producto {
  id: number;
  nombre: string;
  descripcion: string | null;
  precio: number; // number, 2 decimales
  stock: number;
  stock_minimo: number;
  disponible: boolean;
  categoria: { id: number; nombre: string };
}

interface ProductoCreate {
  nombre: string;
  descripcion?: string | null;
  precio: number; // > 0
  stock: number; // >= 0, default 0
  stock_minimo: number; // >= 0, default 5
  disponible: boolean; // default true
  categoria_id: number;
}

interface ProductoUpdate {
  nombre?: string;
  descripcion?: string | null;
  precio?: number;
  stock?: number;
  stock_minimo?: number;
  disponible?: boolean;
  categoria_id?: number;
}
```

---

## `GET /api/v1/productos/`

```json
[
  {
    "id": 1,
    "nombre": "Café con leche",
    "descripcion": "Café espresso con leche vaporizada",
    "precio": 850.0,
    "stock": 50,
    "stock_minimo": 5,
    "disponible": true,
    "categoria": { "id": 1, "nombre": "Bebidas" }
  }
]
```

---

## `POST /api/v1/productos/`

```json
{
  "nombre": "Tostado mixto",
  "descripcion": "Jamón y queso gratinado",
  "precio": 2200.0,
  "stock": 30,
  "stock_minimo": 5,
  "disponible": true,
  "categoria_id": 2
}
```

Éxito `201` · `Producto` (incluye `categoria` anidada).

Errores: `400` `La categoría indicada no existe`, `401`, `403`, `422`.

---

## `DELETE /api/v1/productos/{id}`

- Éxito: `204`, **sin body**.
- Error de negocio: `400` `No se puede eliminar: el producto tiene pedidos
asociados. Marcalo como no disponible en su lugar.`

---

## Reglas transversales

| Regla                               | Verificación                 |
| ----------------------------------- | ---------------------------- |
| `precio` es `number` en JSON (D-05) | Transformer + DTO            |
| `categoria` viene anidada           | `relations: ['categoria']`   |
| `descripcion` nullable explícito    | `null`, no campo omitido     |
| `204` real sin body                 | `@HttpCode(204)` + no return |
| Sin paginación (D-10)               | Array plano                  |
