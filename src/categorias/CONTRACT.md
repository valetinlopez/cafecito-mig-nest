# Contrato — `categorias`

> Extracto operativo de [`docs/api-contract.md`](../../docs/api-contract.md) §6.4.
> Fuente formal: [`docs/openapi.yaml`](../../docs/openapi.yaml).
> Si hay discrepancia, gana el contrato global.

---

## `GET /api/v1/categorias/`

- **Auth:** `auth` (token válido, cualquier rol).
  > El guard todavía no está aplicado (MIG-24); el contrato ya exige `401`.
- **Body:** —
- **Query:** —
- **Éxito:** `200` · `Categoria[]`
- **Errores:** `401`

### Response `200`

```json
[
  { "id": 1, "nombre": "Bebidas" },
  { "id": 2, "nombre": "Comida" }
]
```

### Reglas

| Regla                         | Verificación                   |
| ----------------------------- | ------------------------------ |
| Orden alfabético por `nombre` | `ORDER BY nombre ASC`          |
| Array plano, sin envelope     | Body es `[]`, no `{data}`      |
| Sin paginación (D-10)         | Devuelve todas                 |
| Con y sin barra final (D-04)  | Mismo status y body            |
| Solo lectura                  | No hay `POST`/`PATCH`/`DELETE` |

### Errores

| Código | `detail`                    |
| ------ | --------------------------- |
| `401`  | `Token inválido o expirado` |

---

## Tipo compartido

```ts
interface Categoria {
  id: number;
  nombre: string;
}
```

Consumidor: `productoStore.cargarCategorias()` del frontend.

---

## Fuera de alcance

- Alta, edición y baja de categorías (no existían en el legacy).
- Filtros, búsqueda o paginación.
