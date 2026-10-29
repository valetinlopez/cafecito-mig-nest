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

/**
 * Shape interno del cobro (MIG-31). Ningún endpoint lo devuelve hoy: el cobro
 * responde el `Pedido` y los movimientos usan `MovimientoCaja`.
 */
interface PagoResponseDto {
  id: number;
  pedido_id: number;
  metodo_pago: MetodoPago;
  monto: number; // number, 2 decimales (D-05)
  fecha: string; // ISO-8601 UTC con Z (D-06)
}

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

| Invariante                       | Verificación                          |
| -------------------------------- | ------------------------------------- |
| Un pago por pedido               | `UNIQUE(pedido_id)` + service         |
| `monto > 0` y = total del pedido | Cálculo en servidor                   |
| `metodo_pago` ∈ enum             | `METODOS_PAGO` + validación en DTO    |
| `fecha` ISO-8601 UTC con `Z`     | `toIsoUtc()` en el DTO de response    |
| Pertenece a una caja abierta     | Validación en el cobro (MIG-33)       |
| `monto` sale como JSON `number`  | `numericTransformer` + `fromEntity()` |

---

## 6. Estado de implementación (MIG-31)

| Pieza             | Estado                                                |
| ----------------- | ----------------------------------------------------- |
| `Pago` entity     | ✅ Columnas, unique y transformers                    |
| `PagoResponseDto` | ✅ `fromEntity()` con `number` y `Z`                  |
| `MetodoPago`      | ✅ 5 valores cerrados                                 |
| `PagosService`    | ✅ Movimientos/totales MIG-32; cobro MIG-33 pendiente |
| Relaciones ORM    | ⏳ MIG-32/MIG-44 (faltan `Pedido` y `Caja`)           |
