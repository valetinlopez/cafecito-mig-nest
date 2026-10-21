# Contrato — `pagos`

> `pagos` **no expone endpoints propios**. Su contrato es el efecto que produce
> en dos endpoints de otros módulos.

---

## 1. Endpoints donde participa

| Endpoint                            | Módulo  | Rol de `pagos`                                     |
| ----------------------------------- | ------- | -------------------------------------------------- |
| `POST /api/v1/pedidos/{id}/pago`    | pedidos | Crea el `Pago` dentro de la transacción del cobro. |
| `GET /api/v1/caja/{id}/movimientos` | caja    | Provee los movimientos de la caja.                 |

---

## 2. `POST /api/v1/pedidos/{id}/pago` (extracto)

```json
// request
{ "metodo_pago": "efectivo" }
```

```json
// 200 — pedido resultante
{
  "id": 10,
  "estado": "pagado",
  "total": 300.0,
  "fecha": "2026-10-19T20:24:10.000Z",
  "mesa": { "id": 1, "numero": 5, "estado": "libre" },
  "usuario": { "...": "..." },
  "detalles": []
}
```

Reglas asociadas: pedido `entregado`, caja `abierta`, monto = `total` del pedido.

---

## 3. `GET /api/v1/caja/{id}/movimientos` (extracto)

```json
[
  {
    "id": 5,
    "fecha": "2026-10-19T16:45:00.000Z",
    "pedido_id": 12,
    "mesa_numero": 4,
    "monto": 950.0,
    "metodo_pago": "efectivo",
    "usuario_nombre": "Valentín"
  }
]
```

Errores: `401`, `403`, `404` `Caja no encontrada`.

---

## 4. Tipos

```ts
type MetodoPago =
  'efectivo' | 'debito' | 'credito' | 'transferencia' | 'mercado_pago';

interface MovimientoCaja {
  id: number;
  fecha: string;
  pedido_id: number;
  mesa_numero: number;
  monto: number;
  metodo_pago: MetodoPago;
  usuario_nombre: string | null;
}
```

---

## 5. Invariantes

| Invariante                       | Verificación                  |
| -------------------------------- | ----------------------------- |
| Un pago por pedido               | `UNIQUE(pedido_id)` + service |
| `monto > 0` y = total del pedido | Cálculo en servidor           |
| `metodo_pago` ∈ enum             | DTO + validación              |
| `fecha` ISO-8601 UTC con `Z`     | DTO de response               |
| Pertenece a una caja abierta     | FK + validación en el cobro   |
