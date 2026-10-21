# Contrato — `pedidos`

> Extracto de [`docs/api-contract.md`](../../docs/api-contract.md) §6.5.

---

## Resumen

| Método  | Path                        | Auth  | Éxito              | Errores                           |
| ------- | --------------------------- | ----- | ------------------ | --------------------------------- |
| `GET`   | `/api/v1/pedidos/`          | auth  | `200` · `Pedido[]` | `401`                             |
| `GET`   | `/api/v1/pedidos/{id}`      | auth  | `200` · `Pedido`   | `401`, `404`                      |
| `POST`  | `/api/v1/pedidos/`          | auth  | `201` · `Pedido`   | `400`, `401`, `422`               |
| `PATCH` | `/api/v1/pedidos/{id}`      | auth  | `200` · `Pedido`   | `400`, `401`, `404`, `422`        |
| `POST`  | `/api/v1/pedidos/{id}/pago` | admin | `200` · `Pedido`   | `400`, `401`, `403`, `404`, `422` |

---

## Tipos

```ts
type PedidoEstado =
  | 'pendiente'
  | 'en_preparacion'
  | 'listo'
  | 'entregado'
  | 'pagado'
  | 'cancelado';

type MetodoPago =
  'efectivo' | 'debito' | 'credito' | 'transferencia' | 'mercado_pago';

interface DetallePedido {
  id: number;
  producto_id: number;
  cantidad: number;
  subtotal: number;
}

interface Pedido {
  id: number;
  estado: PedidoEstado;
  total: number;
  fecha: string; // ISO-8601 UTC con Z
  mesa: Mesa;
  usuario: Usuario;
  detalles: DetallePedido[];
}

interface PedidoCreate {
  mesa_id: number;
  detalles: { producto_id: number; cantidad: number }[]; // min 1
}

interface PedidoUpdate {
  estado: PedidoEstado;
}
interface PedidoPagoRequest {
  metodo_pago: MetodoPago;
}
```

---

## `GET /api/v1/pedidos/`

Solo **activos** (no `pagado` ni `cancelado`).

```json
[
  {
    "id": 10,
    "estado": "pendiente",
    "total": 300.0,
    "fecha": "2026-10-19T20:24:10.000Z",
    "mesa": { "id": 1, "numero": 5, "estado": "ocupada" },
    "usuario": {
      "id": 2,
      "nombre": "Valentín",
      "email": "valentin@example.com",
      "rol": "mozo",
      "activo": true
    },
    "detalles": [
      { "id": 1, "producto_id": 1, "cantidad": 2, "subtotal": 300.0 }
    ]
  }
]
```

---

## `POST /api/v1/pedidos/`

```json
{ "mesa_id": 1, "detalles": [{ "producto_id": 1, "cantidad": 2 }] }
```

Éxito `201` · `Pedido`.

Errores de negocio (`400`):

| Caso                   | `detail`                                                          |
| ---------------------- | ----------------------------------------------------------------- |
| Mesa inexistente       | `Mesa N no encontrada`                                            |
| Mesa con pedido activo | `La mesa ya tiene un pedido activo`                               |
| Producto inexistente   | `Producto N no encontrado`                                        |
| Producto no disponible | `Producto N no disponible`                                        |
| Stock insuficiente     | `Stock insuficiente para 'Nombre' (disponible: X, solicitado: Y)` |

---

## `PATCH /api/v1/pedidos/{id}`

```json
{ "estado": "en_preparacion" }
```

Efectos sobre la mesa: `entregado → pendiente_cobro`, `cancelado → libre`,
estados activos → `ocupada`.

Error: `400` `No se puede cambiar el estado de 'X' a 'Y'`.

---

## `POST /api/v1/pedidos/{id}/pago`

```json
{ "metodo_pago": "efectivo" }
```

Éxito `200` · `Pedido` en estado `pagado`.

Errores:

| Código | `detail`                                                                    |
| ------ | --------------------------------------------------------------------------- |
| `400`  | `Solo se puede cobrar un pedido en estado 'entregado' (estado actual: 'X')` |
| `400`  | `No se puede cobrar un pedido sin una caja abierta`                         |

---

## Reglas transversales

- `total` y `subtotal` como `number` (D-05).
- `fecha` ISO-8601 UTC con `Z` (D-06).
- Estados en `snake_case` y sin traducir.
- `POST /pago` responde `200`, no `201` (D-07).
