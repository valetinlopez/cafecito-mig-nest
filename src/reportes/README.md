# Módulo `reportes`

| Campo        | Valor                                               |
| ------------ | --------------------------------------------------- |
| Estado       | **Scaffold** (módulo registrado, sin código propio) |
| Endpoints    | 1 (ver [`CONTRACT.md`](./CONTRACT.md))              |
| Dependencias | `pagos`, `caja`, `pedidos`, `productos`, `mesas`    |
| Tests        | Pendientes                                          |

---

## 1. Responsabilidad

Generar el reporte de ventas por período: resumen, ventas por método de pago,
productos más vendidos, mesas utilizadas y detalle de cajas.

Es de **solo lectura** y la consulta más pesada del sistema. El diseño debe
evitar cargar filas en memoria.

---

## 2. Estado actual

```
src/reportes/
└── reportes.module.ts    # @Module({}) — vacío
```

---

## 3. Estructura objetivo

```
src/reportes/
├── reportes.module.ts
├── reportes.controller.ts
├── reportes.service.ts
├── reportes.service.spec.ts
├── dto/
│   ├── reporte-ventas-query.dto.ts
│   └── reporte-ventas-response.dto.ts
├── README.md · CONTRACT.md · DECISIONS.md
```

---

## 4. Reglas de negocio

- `desde` y `hasta` son **obligatorios** y en formato `YYYY-MM-DD`.
- Rango **inclusivo** en ambos extremos.
- `desde > hasta` → `400` `La fecha 'desde' no puede ser posterior a 'hasta'`.
- Requiere rol `admin`.
- `pedidos_cobrados` cuenta pedidos distintos con pago; `cantidad_cobros` cuenta
  pagos (normalmente iguales, pero pueden diferir por datos históricos).
- `ticket_promedio = total_vendido / pedidos_cobrados`; si es 0, `0`.
- `diferencia` de caja = `monto_final - (monto_inicial + ventas_efectivo)`.

---

## 5. Consideraciones

- Una consulta por bloque, agregando en SQL y filtrando por rango de fechas
  sobre `pagos.fecha`.
- Los arrays vacíos son `[]`, nunca `null`.
- Sin paginación (D-10).
- El período se interpreta en la zona horaria de negocio (ver `DECISIONS.md`).

---

## 6. Tests esperados

- Período con ventas: totales, agrupaciones y ticket promedio correctos.
- Período sin ventas: ceros y arrays vacíos.
- `desde > hasta` → `400`.
- Fechas inválidas → `422`.
- Límites inclusivos: un pago del `hasta` a las 23:59 entra.
- e2e de `403` con rol `mozo`.

---

## 7. Referencias

- [`CONTRACT.md`](./CONTRACT.md) · [`DECISIONS.md`](./DECISIONS.md)
- `docs/api-contract.md` §6.9
