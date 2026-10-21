# Módulo `dashboard`

| Campo        | Valor                                               |
| ------------ | --------------------------------------------------- |
| Estado       | **Scaffold** (módulo registrado, sin código propio) |
| Endpoints    | 1 (ver [`CONTRACT.md`](./CONTRACT.md))              |
| Dependencias | `mesas`, `pedidos`, `pagos`, `caja`                 |
| Tests        | Pendientes                                          |

---

## 1. Responsabilidad

Entregar el resumen operativo del día para la pantalla principal del admin:
ventas, estado de mesas, pedidos activos, estado de caja y últimos pedidos.

Es un módulo de **solo lectura**: no escribe datos ni tiene reglas de negocio
propias; agrega información de otros módulos.

---

## 2. Estado actual

```
src/dashboard/
└── dashboard.module.ts    # @Module({}) — vacío
```

---

## 3. Estructura objetivo

```
src/dashboard/
├── dashboard.module.ts
├── dashboard.controller.ts
├── dashboard.service.ts
├── dashboard.service.spec.ts
├── dto/
│   └── dashboard-resumen-response.dto.ts
├── README.md · CONTRACT.md · DECISIONS.md
```

Sin `entities/`: no posee tablas.

---

## 4. Reglas de negocio

- Requiere rol `admin`.
- `ventas_dia`: total cobrado y cantidad de pagos **del día en curso**.
- `mesas`: totales por estado (`libres`, `ocupadas`, `pendientes_cobro`).
- `pedidos_activos`: totales por estado activo (`pendientes`, `en_preparacion`,
  `listos`, `entregados`).
- `caja`: estado y monto inicial de la caja abierta, o valores nulos si no hay.
- `ultimos_pedidos`: los más recientes, con mesa, cantidad de ítems, total y
  estado.

---

## 5. Consideraciones de performance

- Todo se resuelve con agregaciones en SQL (`COUNT`, `SUM`, `GROUP BY`), no
  cargando tablas completas en memoria.
- Si el dashboard se refresca seguido, evaluar una sola query con CTEs o
  `Promise.all` de agregados independientes.

---

## 6. Tests esperados

- Con datos: cada bloque devuelve los totales correctos.
- Sin datos: totales en `0`, listas vacías, caja en `null`.
- `ultimos_pedidos` respeta el límite y el orden.
- e2e de `403` con rol `mozo`.

---

## 7. Referencias

- [`CONTRACT.md`](./CONTRACT.md) · [`DECISIONS.md`](./DECISIONS.md)
- `docs/api-contract.md` §6.7
