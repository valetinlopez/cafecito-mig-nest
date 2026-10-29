# AGENTS.md — `pedidos`

> Instrucciones locales de este directorio. Leelo antes de tocar `src/pedidos/`.

| Campo      | Valor                                          |
| ---------- | ---------------------------------------------- |
| Estado     | Entities + DTOs (MIG-30); service en MIG-33    |
| Contrato   | [`./CONTRACT.md`](./CONTRACT.md) · global §6.5 |
| Decisiones | [`./DECISIONS.md`](./DECISIONS.md)             |
| Depende de | `mesas`, `productos`, `users`, `caja`, `pagos` |

## Antes de implementar

1. [`README.md`](./README.md) — modelo, relaciones y estado del módulo.
2. [`CONTRACT.md`](./CONTRACT.md) — 5 endpoints y shapes anidados.
3. [`DECISIONS.md`](./DECISIONS.md) — D-09 a D-14 (relaciones, cascada, DTOs).
4. `docs/glossary.md` §3.1 — transiciones del pedido.

## Reglas locales

- `PEDIDO_ESTADOS` es la única fuente del enum; no repetir literales.
- `total` y `subtotal` usan `numericTransformer`; el DTO refuerza con `Number()`.
- `fecha` usa `utcTimestampTransformer`; el DTO serializa con `toIsoUtc()`.
- `subtotal` es histórico: nunca se recalcula desde `Producto.precio`.
- `detalles` solo tiene `cascade: ['insert']`; nunca `update`/`remove`.
- El FK escalar (`mesaId`, `pedidoId`, …) convive con la relación sobre la misma
  columna: no declarar una segunda columna para el mismo campo.
- `PedidoResponseDto.fromEntity()` exige `mesa`, `usuario` y `detalles`
  hidratados; se piden con `relations` explícitas, nunca con `eager`.
- `METODOS_PAGO` se importa de `pagos`; `PedidoPagoDto` no declara `monto`.
- Nombres `detalle_pedidos` y FK se confirman con `schema:log` en MIG-44.
- Sin `forwardRef`: las relaciones son metadata, no providers.

## Verificación

```bash
npm test -- pedidos
npm run test:e2e
```
