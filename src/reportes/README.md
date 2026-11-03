# Módulo `reportes`

| Campo        | Valor                                                |
| ------------ | ---------------------------------------------------- |
| Estado       | **Implementado** (MIG-37)                            |
| Endpoints    | 1 (ver [`CONTRACT.md`](./CONTRACT.md))               |
| Dependencias | `pagos`, `caja`, `pedidos`, `productos`, `mesas`     |
| Tests        | `reportes.service.spec.ts` · `reporte-ventas.dto.spec.ts` · `test/reportes.e2e-spec.ts` |

---

## 1. Responsabilidad

Generar el reporte de ventas por período: resumen, ventas por método de pago,
productos más vendidos, mesas utilizadas y detalle de cajas.

Es de **solo lectura** y la consulta más pesada del sistema. El diseño evita
cargar filas en memoria: cada bloque es una agregación SQL y los cinco se
ejecutan en paralelo.

---

## 2. Estructura

```
src/reportes/
├── reportes.module.ts
├── reportes.controller.ts
├── reportes.service.ts
├── reportes.service.spec.ts
├── dto/
│   ├── reporte-ventas-query.dto.ts
│   ├── reporte-ventas-response.dto.ts
│   └── reporte-ventas.dto.spec.ts
├── README.md · CONTRACT.md · DECISIONS.md
```

---

## 3. Bloques y consultas

| Bloque                | Raíz              | Agregación                                                        |
| --------------------- | ----------------- | ----------------------------------------------------------------- |
| `resumen`             | `pagos`           | `SUM(monto)`, `COUNT(id)`, `COUNT(DISTINCT pedido_id)`            |
| `ventas_por_metodo`   | `pagos`           | `GROUP BY metodo_pago`, `ORDER BY total DESC`                     |
| `productos_mas_vendidos` | `detalle_pedidos` | joins a pedido, pago y producto; `LIMIT 20`                    |
| `mesas_utilizadas`    | `pedidos`         | joins a mesa y pago; `GROUP BY mesa`, `ORDER BY cantidad DESC`     |
| `cajas`               | `cajas`           | `LEFT JOIN pagos` para `ventas_efectivo`; filtro de intersección   |

---

## 4. Reglas de negocio

- `desde` y `hasta` son **obligatorios** y en formato `YYYY-MM-DD`.
- Rango **inclusivo** en ambos extremos, interpretado en
  `America/Argentina/Buenos_Aires` y consultado en UTC con límite superior
  exclusivo (inicio del día siguiente).
- `desde > hasta` → `400` `La fecha 'desde' no puede ser posterior a 'hasta'`.
- Requiere rol `admin`.
- Un pedido cuenta como vendido si tiene un **cobro** dentro del período.
- `pedidos_cobrados` cuenta pedidos distintos con pago; `cantidad_cobros` cuenta
  pagos (normalmente iguales, pero pueden diferir por datos históricos).
- `ticket_promedio = total_vendido / cantidad_cobros`; si no hay cobros, `0`.
- `productos_mas_vendidos`: máximo 20, ordenado por cantidad descendente.
- `cajas`: solo las que intersectan el período; `ventas_efectivo` suma todos los
  cobros en efectivo de la caja (no se limita al período).
- `diferencia` de caja = `monto_final - (monto_inicial + ventas_efectivo)`;
  `null` si la caja sigue abierta.

---

## 5. Consideraciones

- Los arrays vacíos son `[]`, nunca `null`.
- Sin paginación (D-06).
- Los montos derivados se redondean a dos decimales.
- La conversión de zona vive en `src/common/time/business-timezone.ts` y la
  comparte con `dashboard`; no duplicarla.

---

## 6. Tests

- Período con ventas: totales, agrupaciones, ticket promedio y top 20.
- Período sin ventas: ceros y arrays vacíos.
- `desde > hasta` → `400` sin consultar la base.
- Fechas inválidas o faltantes → `422`.
- Límites inclusivos: un cobro del `hasta` a las 23:59 local entra.
- Cajas abiertas, cerradas, negativas y fuera de rango.
- e2e de `200`, `401`, `403`, `422` y `400`.

---

## 7. Referencias

- [`CONTRACT.md`](./CONTRACT.md) · [`DECISIONS.md`](./DECISIONS.md)
- `docs/api-contract.md` §6.9 · `specs/037-reportes/`
