# AGENTS.md — `pagos`

> Instrucciones locales de este directorio. Leelo antes de tocar `src/pagos/`.

| Campo      | Valor                                            |
| ---------- | ------------------------------------------------ |
| Estado     | Scaffold (módulo vacío)                          |
| Contrato   | [`./CONTRACT.md`](./CONTRACT.md) — sin endpoints |
| Decisiones | [`./DECISIONS.md`](./DECISIONS.md)               |
| Depende de | `pedidos`, `caja`, `users`                       |

## Antes de implementar

1. [`README.md`](./README.md) — rol de soporte.
2. [`CONTRACT.md`](./CONTRACT.md) — endpoints donde participa.
3. [`DECISIONS.md`](./DECISIONS.md) — un pago por pedido y transacción.

## Reglas locales

- **Sin controller propio**: no existen endpoints `/pagos`.
- Un pedido tiene como máximo un pago (`UNIQUE(pedido_id)`).
- El monto es `pedido.total`; no se acepta un monto del cliente.
- La caja se resuelve en el servidor (la abierta); no se recibe `caja_id`.
- El `Pago` se crea dentro de la transacción del cobro, junto con el cambio de estado.
- `metodo_pago` es un enum cerrado de 5 valores.
- Movimientos de caja se derivan de pagos; no crear tabla espejo.

## Verificación

```bash
npm test -- pagos
npm run test:e2e
```
