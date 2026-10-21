# AGENTS.md — `pedidos`

> Instrucciones locales de este directorio. Leelo antes de tocar `src/pedidos/`.

| Campo      | Valor                                          |
| ---------- | ---------------------------------------------- |
| Estado     | Scaffold (módulo vacío)                        |
| Contrato   | [`./CONTRACT.md`](./CONTRACT.md) · global §6.5 |
| Decisiones | [`./DECISIONS.md`](./DECISIONS.md)             |
| Depende de | `mesas`, `productos`, `users`, `caja`, `pagos` |

## Antes de implementar

1. [`README.md`](./README.md) — reglas de creación, estados y cobro.
2. [`CONTRACT.md`](./CONTRACT.md) — 5 endpoints y shapes anidados.
3. [`DECISIONS.md`](./DECISIONS.md) — transacción y atomicidad.
4. `docs/glossary.md` §3.1 — transiciones del pedido.

## Reglas locales

- Crear pedido es **una transacción**: validar, insertar, descontar stock y ocupar mesa.
- El precio y el total los calcula el servidor; el cliente solo envía cantidades.
- Descuento de stock atómico y condicional (`WHERE stock >= :n`).
- Dos mapas de transición: manual (`PATCH`) y pago (`POST /pago`); `entregado → pagado`
  **solo** por el endpoint de pago.
- `GET /pedidos/` devuelve solo activos (excluye `pagado` y `cancelado`).
- Al cancelar, reponer stock en la misma transacción (idempotente).
- Sin `forwardRef`; mover la regla al módulo dueño si hay ciclo.

## Verificación

```bash
npm test -- pedidos
npm run test:e2e
```
