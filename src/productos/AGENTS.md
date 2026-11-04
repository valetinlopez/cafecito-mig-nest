# AGENTS.md — `productos`

> Instrucciones locales de este directorio. Leelo antes de tocar `src/productos/`.

| Campo      | Valor                                          |
| ---------- | ---------------------------------------------- |
| Estado     | Implementado: GET/POST/PATCH (MIG-29) y DELETE (MIG-38) |
| Contrato   | [`./CONTRACT.md`](./CONTRACT.md) · global §6.3 |
| Decisiones | [`./DECISIONS.md`](./DECISIONS.md)             |
| Depende de | `categorias`                                   |

## Antes de implementar

1. [`README.md`](./README.md) — modelo y reglas.
2. [`CONTRACT.md`](./CONTRACT.md) — 5 endpoints.
3. [`DECISIONS.md`](./DECISIONS.md) — decimales, categoría y stock.
4. `docs/adr/0004-decimales-number.md`.

## Reglas locales

- `precio` se almacena como string `numeric(10,2)` y el response DTO lo convierte temporalmente a `number`; transformer compartido pendiente, sin ticket.
- Response con `categoria: { id, nombre }`; request con `categoria_id`.
- La relación ORM con categoría solo declara la FK (D-03); hidratar categoría vía `CategoriasService`.
- El stock lo descuenta `pedidos`, no este módulo.
- `DELETE` consulta pedidos asociados por `ProductUsagePort`, sin importar
  `PedidosModule` (D-08): `pedidos` ya depende de `productos`.
- `descripcion` nullable devuelve `null`, no se omite.
- Validar `categoria_id` en el service para responder `400`, no `500`.

## Verificación

```bash
npm test -- productos
npm run test:e2e
```
