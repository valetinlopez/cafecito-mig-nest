# Contrato — `mesas`

> Extracto de [`docs/api-contract.md`](../../docs/api-contract.md) §6.2.

---

## Resumen

| Método  | Path                 | Auth  | Éxito            | Errores                    |
| ------- | -------------------- | ----- | ---------------- | -------------------------- |
| `GET`   | `/api/v1/mesas/`     | auth  | `200` · `Mesa[]` | `401`                      |
| `GET`   | `/api/v1/mesas/{id}` | auth  | `200` · `Mesa`   | `401`, `404`               |
| `POST`  | `/api/v1/mesas/`     | admin | `201` · `Mesa`   | `400`, `401`, `403`, `422` |
| `PATCH` | `/api/v1/mesas/{id}` | auth  | `200` · `Mesa`   | `400`, `401`, `404`, `422` |

---

## Tipos

```ts
type MesaEstado =
  'libre' | 'ocupada' | 'reservada' | 'pendiente_cobro' | 'en_limpieza';

interface Mesa {
  id: number;
  numero: number;
  estado: MesaEstado;
}

interface MesaCreate {
  numero: number;
} // > 0
interface MesaUpdate {
  estado: MesaEstado;
}
```

---

## `GET /api/v1/mesas/`

```json
[
  { "id": 1, "numero": 1, "estado": "libre" },
  { "id": 2, "numero": 2, "estado": "ocupada" }
]
```

---

## `GET /api/v1/mesas/{id}`

`200` · `Mesa` · `404` `Mesa no encontrada`.

---

## `POST /api/v1/mesas/`

```json
// request
{ "numero": 13 }
// 201
{ "id": 13, "numero": 13, "estado": "libre" }
```

Errores: `400` `Ya existe una mesa con el número N`, `401`, `403`, `422`.

---

## `PATCH /api/v1/mesas/{id}`

```json
{ "estado": "ocupada" }
```

Errores:

| Código | `detail`                                                                     |
| ------ | ---------------------------------------------------------------------------- |
| `400`  | `No se puede cambiar el estado de 'X' a 'Y'`                                 |
| `400`  | `No se puede pasar la mesa a limpieza: tiene un pedido activo sin cobrar...` |
| `404`  | `Mesa no encontrada`                                                         |
| `422`  | `estado` fuera del enum                                                      |

---

## Transiciones manuales

| Desde             | Hacia                  |
| ----------------- | ---------------------- |
| `libre`           | `ocupada`, `reservada` |
| `reservada`       | `ocupada`, `libre`     |
| `ocupada`         | `en_limpieza`          |
| `pendiente_cobro` | `ocupada`              |
| `en_limpieza`     | `libre`                |

No manuales: `ocupada → pendiente_cobro` (pedido entregado) y
`pendiente_cobro → libre` (cobro).

---

## Reglas transversales

- Paths de colección con y sin barra final (D-04).
- `estado` siempre uno de los 5 valores, en `snake_case`.
- Sin paginación (D-10).
