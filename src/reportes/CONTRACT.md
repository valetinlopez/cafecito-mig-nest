# Contrato — `reportes`

> Extracto de [`docs/api-contract.md`](../../docs/api-contract.md) §6.9.

---

## `GET /api/v1/reportes/ventas`

- **Auth:** `admin`
- **Query:** `desde` (date, requerido, inclusive), `hasta` (date, requerido, inclusive)
- **Éxito:** `200` · `ReporteVentasResponse`
- **Errores:** `400`, `401`, `403`, `422`

### Ejemplo

```
GET /api/v1/reportes/ventas?desde=2026-10-01&hasta=2026-10-19
```

```json
{
  "periodo": { "desde": "2026-10-01", "hasta": "2026-10-19" },
  "resumen": {
    "total_vendido": 125000.0,
    "cantidad_cobros": 84,
    "pedidos_cobrados": 80,
    "ticket_promedio": 1488.1
  },
  "ventas_por_metodo": [
    { "metodo_pago": "efectivo", "cantidad": 40, "total": 60000.0 }
  ],
  "productos_mas_vendidos": [
    {
      "producto_id": 1,
      "nombre": "Café con leche",
      "cantidad": 120,
      "total": 102000.0
    }
  ],
  "mesas_utilizadas": [
    { "mesa_id": 1, "numero": 1, "cantidad_pedidos": 18, "total": 27000.0 }
  ],
  "cajas": [
    {
      "caja_id": 1,
      "estado": "cerrada",
      "fecha_apertura": "2026-10-18T11:00:00.000Z",
      "fecha_cierre": "2026-10-18T23:00:00.000Z",
      "monto_inicial": 1000.0,
      "ventas_efectivo": 40000.0,
      "monto_final": 41500.0,
      "diferencia": 500.0
    }
  ]
}
```

### Tipos

```ts
interface ReportePeriodo {
  desde: string;
  hasta: string;
}
interface ReporteResumen {
  total_vendido: number;
  cantidad_cobros: number;
  pedidos_cobrados: number;
  ticket_promedio: number;
}
interface ReporteVentasMetodo {
  metodo_pago: string;
  cantidad: number;
  total: number;
}
interface ReporteProductoVendido {
  producto_id: number;
  nombre: string;
  cantidad: number;
  total: number;
}
interface ReporteMesaUtilizada {
  mesa_id: number;
  numero: number;
  cantidad_pedidos: number;
  total: number;
}
interface ReporteCajaDetalle {
  caja_id: number;
  estado: string;
  fecha_apertura: string;
  fecha_cierre: string | null;
  monto_inicial: number;
  ventas_efectivo: number;
  monto_final: number | null;
  diferencia: number | null;
}

interface ReporteVentasResponse {
  periodo: ReportePeriodo;
  resumen: ReporteResumen;
  ventas_por_metodo: ReporteVentasMetodo[];
  productos_mas_vendidos: ReporteProductoVendido[];
  mesas_utilizadas: ReporteMesaUtilizada[];
  cajas: ReporteCajaDetalle[];
}
```

### Errores

| Código | `detail`                                            |
| ------ | --------------------------------------------------- |
| `400`  | `La fecha 'desde' no puede ser posterior a 'hasta'` |
| `422`  | Formato de fecha inválido o parámetro faltante      |
| `403`  | `Se requiere rol de administrador`                  |

### Reglas

- Rango inclusivo: `desde 00:00:00` a `hasta 23:59:59.999` en la zona de negocio.
- Arrays vacíos, nunca `null`.
- `fecha_apertura`/`fecha_cierre` ISO-8601 UTC con `Z`.
- Montos como `number`.
