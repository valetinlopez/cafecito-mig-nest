# AGENTS.md — `pagos`

> Instrucciones locales de este directorio. Leelo antes de tocar `src/pagos/`.

| Campo      | Valor                                                  |
| ---------- | ------------------------------------------------------ |
| Estado     | Entity + DTOs + esqueleto de service (MIG-31)           |
| Contrato   | [`./CONTRACT.md`](./CONTRACT.md) — sin endpoints        |
| Decisiones | [`./DECISIONS.md`](./DECISIONS.md)                      |
| Depende de | `pedidos`, `caja`, `users`                              |

## Antes de implementar

1. [`README.md`](./README.md) — modelo, nullabilidad y estado del esqueleto.
2. [`CONTRACT.md`](./CONTRACT.md) — endpoints donde participa y shapes.
3. [`DECISIONS.md`](./DECISIONS.md) — D-08 a D-11 (nullable, relaciones, 501).
4. `docs/adr/0004-decimales-number.md` y `docs/adr/0007-zona-horaria-proceso.md`.

## Reglas locales

- **Sin controller propio**: no existen endpoints `/pagos`.
- Un pedido tiene como máximo un pago (`pagos_pedido_id_key`).
- El monto es `pedido.total`; no se acepta un monto del cliente.
- La caja se resuelve en el servidor (la abierta); no se recibe `caja_id`.
- El `Pago` se crea dentro de la transacción del cobro; eso vive en MIG-33.
- `metodo_pago` sale siempre de `METODOS_PAGO`; no repetir literales.
- `numericTransformer` y `utcTimestampTransformer` se importan de `common`.
- Sin relaciones ORM hasta que existan `Pedido` y `Caja` (D-09).
- El DTO expone solo `id`, `pedido_id`, `metodo_pago`, `monto`, `fecha`.
- Movimientos de caja se derivan de pagos; no crear tabla espejo.

## Verificación

```bash
npm test -- pagos
npm run test:e2e
```
