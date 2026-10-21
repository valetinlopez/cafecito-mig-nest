# Contrato — `dashboard`

> Extracto de [`docs/api-contract.md`](../../docs/api-contract.md) §6.7.

---

## `GET /api/v1/dashboard/resumen`

- **Auth:** `admin`
- **Body/Query:** —
- **Éxito:** `200` · `DashboardResumen`
- **Errores:** `401`, `403`

### Response `200`

```json
{
  "ventas_dia": { "total": 12500.0, "pagos": 8 },
  "mesas": { "total": 12, "libres": 5, "ocupadas": 4, "pendientes_cobro": 3 },
  "pedidos_activos": {
    "total": 7,
    "pendientes": 2,
    "en_preparacion": 2,
    "listos": 1,
    "entregados": 2
  },
  "caja": {
    "estado": "abierta",
    "monto_inicial": 5000.0,
    "fecha_apertura": "2026-10-19T11:00:00.000Z"
  },
  "ultimos_pedidos": [
    { "id": 15, "mesa": 5, "items": 3, "total": 4500.0, "estado": "entregado" }
  ]
}
```

### Tipos

```ts
interface DashboardVentasDia {
  total: number;
  pagos: number;
}
interface DashboardMesasResumen {
  total: number;
  libres: number;
  ocupadas: number;
  pendientes_cobro: number;
}
interface DashboardPedidosActivos {
  total: number;
  pendientes: number;
  en_preparacion: number;
  listos: number;
  entregados: number;
}
interface DashboardCajaEstado {
  estado: string;
  monto_inicial: number | null;
  fecha_apertura: string | null;
}
interface DashboardUltimoPedido {
  id: number;
  mesa: number;
  items: number;
  total: number;
  estado: string;
}

interface DashboardResumen {
  ventas_dia: DashboardVentasDia;
  mesas: DashboardMesasResumen;
  pedidos_activos: DashboardPedidosActivos;
  caja: DashboardCajaEstado;
  ultimos_pedidos: DashboardUltimoPedido[];
}
```

### Reglas

| Regla                                      | Verificación                                                                                      |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| Montos como `number`                       | Agregados + DTO                                                                                   |
| `fecha_apertura` ISO con `Z` o `null`      | `toISOString()` / `null`                                                                          |
| Sin caja abierta → `estado` y montos nulos | `caja: { estado: 'cerrada', monto_inicial: null, fecha_apertura: null }` (a confirmar con legacy) |
| Listas vacías, no `null`                   | `ultimos_pedidos: []`                                                                             |
| Solo lectura                               | No hay otros métodos                                                                              |
