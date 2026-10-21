# AGENTS.md — `productos`

> Instrucciones locales de este directorio. Leelo antes de tocar `src/productos/`.

| Campo      | Valor                                          |
| ---------- | ---------------------------------------------- |
| Estado     | Scaffold (módulo vacío)                        |
| Contrato   | [`./CONTRACT.md`](./CONTRACT.md) · global §6.3 |
| Decisiones | [`./DECISIONS.md`](./DECISIONS.md)             |
| Depende de | `categorias`                                   |

## Antes de implementar

1. [`README.md`](./README.md) — modelo y reglas.
2. [`CONTRACT.md`](./CONTRACT.md) — 5 endpoints.
3. [`DECISIONS.md`](./DECISIONS.md) — decimales, categoría y stock.
4. `docs/adr/0004-decimales-number.md`.

## Reglas locales

- `precio` es `numeric(10,2)` con `numericTransformer` y sale como `number`.
- Response con `categoria: { id, nombre }`; request con `categoria_id`.
- `@ManyToOne(() => Categoria)` sin `eager`; pedir `relations` explícitamente.
- El stock lo descuenta `pedidos`, no este módulo.
- `DELETE` solo sin pedidos asociados; el resto se marca `disponible = false`.
- `descripcion` nullable devuelve `null`, no se omite.
- Validar `categoria_id` en el service para responder `400`, no `500`.

## Verificación

```bash
npm test -- productos
npm run test:e2e
```
