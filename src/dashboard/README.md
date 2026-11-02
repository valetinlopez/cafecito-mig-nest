# Módulo `dashboard`

| Campo        | Valor                                               |
| ------------ | --------------------------------------------------- |
| Estado       | Implementado (MIG-34; revisión final pendiente)    |
| Endpoints    | 1 (ver [`CONTRACT.md`](./CONTRACT.md))              |
| Dependencias | `mesas`, `pedidos`, `pagos`, `caja`                 |
| Tests        | Unitarios + E2E                                     |

---

## 1. Responsabilidad

Entregar el resumen operativo del día para la pantalla principal del admin:
ventas, estado de mesas, pedidos activos, estado de caja y últimos pedidos.

Es un módulo de **solo lectura**: no escribe datos ni tiene reglas de negocio
propias; agrega información de otros módulos.

---

## 2. Implementación

El endpoint reúne cinco consultas de base en paralelo: pagos del día de negocio,
mesas por estado, pedidos activos por estado, caja abierta y pedidos recientes.
Las consultas agregadas retornan proyecciones; no se materializan tablas enteras
en memoria. El DTO construye el shape de [`CONTRACT.md`](./CONTRACT.md).

```
src/dashboard/
├── dashboard.module.ts
├── dashboard.controller.ts
├── dashboard.service.ts
├── dashboard.service.spec.ts
├── dto/
│   └── dashboard-resumen-response.dto.ts
├── AGENTS.md · README.md · CONTRACT.md · DECISIONS.md
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
- `ultimos_pedidos`: hasta 50 de cualquier estado, ordenados por fecha
  descendente (desempate por id), con número de mesa, suma de cantidades,
  total y estado. Se exponen como `mesa` e `items`, según el contrato vigente.
- Si existen varias cajas abiertas, se representa la de apertura más reciente.

---

## 5. Consideraciones de performance

- Todo se resuelve con agregaciones en SQL (`COUNT`, `SUM`, `GROUP BY`), no
  cargando tablas completas en memoria.
- Los bloques independientes se consultan con `Promise.all`.

---

## 6. Tests esperados

- Con datos: cada bloque devuelve los totales correctos.
- Sin datos: totales en `0`, listas vacías, caja en `null`.
- `ultimos_pedidos` respeta el límite de 50, el orden y la suma de cantidades.
- El día de ventas usa `America/Argentina/Buenos_Aires` y un rango semiabierto
  convertido a UTC.
- E2E verifica admin `200`, `401` sin token y `403` con rol `mozo`.

---

## 7. Referencias

- [`CONTRACT.md`](./CONTRACT.md) · [`DECISIONS.md`](./DECISIONS.md)
- `docs/api-contract.md` §6.7
