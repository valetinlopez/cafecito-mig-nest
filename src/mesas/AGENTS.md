# AGENTS.md — `mesas`

> Instrucciones locales de este directorio. Leelo antes de tocar `src/mesas/`.

| Campo      | Valor                                          |
| ---------- | ---------------------------------------------- |
| Estado     | Scaffold (módulo vacío)                        |
| Contrato   | [`./CONTRACT.md`](./CONTRACT.md) · global §6.2 |
| Decisiones | [`./DECISIONS.md`](./DECISIONS.md)             |
| Depende de | `pedidos` (efectos de estado)                  |

## Antes de implementar

1. [`README.md`](./README.md) — reglas y efectos.
2. [`CONTRACT.md`](./CONTRACT.md) — 4 endpoints y transiciones.
3. [`DECISIONS.md`](./DECISIONS.md) — mapa único de transiciones.
4. `docs/glossary.md` §3.2 — tabla de estados.

## Reglas locales

- Las transiciones manuales viven en **un solo mapa** (`TRANSICIONES_MESA`).
- Las transiciones automáticas las ejecuta `pedidos`; `mesas` no las duplica.
- Antes de `ocupada → en_limpieza`, verificar que no haya pedido activo sin cobrar.
- `numero` único con restricción nombrada segun la base real.
- Sin `DELETE`: los pedidos históricos referencian la mesa.
- Evitar `forwardRef`: si aparece un ciclo, mover la regla al módulo dueño.

## Verificación

```bash
npm test -- mesas
npm run test:e2e
```
