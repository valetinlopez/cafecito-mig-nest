# Contrato — `caja`

> Extracto de [`docs/api-contract.md`](../../docs/api-contract.md) §6.6.

Todos los endpoints requieren **`admin`**.

---

## Resumen

| Método | Path                            | Éxito                      | Errores                    |
| ------ | ------------------------------- | -------------------------- | -------------------------- |
| `GET`  | `/api/v1/caja/`                 | `200` · `Caja \| null`     | `401`, `403`               |
| `GET`  | `/api/v1/caja/historial`        | `200` · `Caja[]`           | `401`, `403`               |
| `GET`  | `/api/v1/caja/{id}/movimientos` | `200` · `MovimientoCaja[]` | `401`, `403`, `404`        |
| `POST` | `/api/v1/caja/apertura`         | `201` · `Caja`             | `400`, `401`, `403`, `422` |
| `POST` | `/api/v1/caja/cierre`           | `200` · `Caja`             | `400`, `401`, `403`, `422` |

---

## Tipos

```ts
type CajaEstado = 'abierta' | 'cerrada';
type MetodoPago =
  'efectivo' | 'debito' | 'credito' | 'transferencia' | 'mercado_pago';

interface Caja {
  id: number;
  fecha_apertura: string; // ISO-8601 UTC con Z
  fecha_cierre: string | null;
  monto_inicial: number;
  monto_final: number | null;
  estado: CajaEstado;
  total_ventas: number;
}

interface CajaApertura {
  monto_inicial: number;
}
interface CajaCierre {
  monto_final: number;
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

## `GET /api/v1/caja/`

```json
{
  "id": 1,
  "fecha_apertura": "2026-10-19T11:00:00.000Z",
  "fecha_cierre": null,
  "monto_inicial": 1000.0,
  "monto_final": null,
  "estado": "abierta",
  "total_ventas": 2500.0
}
```

Sin caja abierta → `200` con body **`null`** (JSON literal, D-09).

---

## `GET /api/v1/caja/historial`

`200` · `Caja[]`, más reciente primero (`fecha_apertura DESC`).

---

## `GET /api/v1/caja/{id}/movimientos`

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

`404` `Caja no encontrada`.

---

## `POST /api/v1/caja/apertura`

```json
{ "monto_inicial": 1000.0 }
```

`201` · `Caja`. Error: `400` `Ya hay una caja abierta`.

---

## `POST /api/v1/caja/cierre`

```json
{ "monto_final": 3500.0 }
```

`200` · `Caja`. Error: `400` `No hay una caja abierta`.

---

## Reglas transversales

| Regla                              | Verificación             |
| ---------------------------------- | ------------------------ |
| `null` literal, no body vacío      | `res.json(null)` + e2e   |
| Montos como `number` (D-05)        | Transformer + DTO        |
| Fechas ISO-8601 UTC con `Z` (D-06) | `toISOString()`          |
| Una sola caja abierta              | Validación + transacción |
| `total_ventas` derivado de pagos   | Cálculo, no columna      |
