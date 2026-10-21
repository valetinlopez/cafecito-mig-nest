# AGENTS.md — `dashboard`

> Instrucciones locales de este directorio. Leelo antes de tocar `src/dashboard/`.

| Campo      | Valor                                          |
| ---------- | ---------------------------------------------- |
| Estado     | Scaffold (módulo vacío)                        |
| Contrato   | [`./CONTRACT.md`](./CONTRACT.md) · global §6.7 |
| Decisiones | [`./DECISIONS.md`](./DECISIONS.md)             |
| Depende de | `mesas`, `pedidos`, `pagos`, `caja`            |

## Antes de implementar

1. [`README.md`](./README.md) — bloques del resumen.
2. [`CONTRACT.md`](./CONTRACT.md) — shape `DashboardResumen`.
3. [`DECISIONS.md`](./DECISIONS.md) — zona horaria y agregaciones.

## Reglas locales

- Solo lectura: **no escribe** ni tiene entity propia.
- Agregaciones en SQL (`COUNT`, `SUM`, `GROUP BY`); no cargar tablas en memoria.
- "Ventas del día" usa la zona de negocio (`America/Argentina/Buenos_Aires`),
  no UTC; confirmar con producto antes de cambiar.
- Sin datos: ceros y `[]`, nunca `null` (salvo `caja`).
- `ultimos_pedidos` con límite y orden por fecha descendente.
- Requiere `admin`.

## Verificación

```bash
npm test -- dashboard
npm run test:e2e
```
