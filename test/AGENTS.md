# AGENTS.md — `test`

> Instrucciones locales del harness de testing. Leelo antes de tocar `test/`.

| Campo  | Valor                                       |
| ------ | ------------------------------------------- |
| Estado | Implementado (MIG-21)                       |
| Guía   | [`./README.md`](./README.md)                |
| Runner | Vitest 4 (ver ADR 0006)                     |
| Config | `vitest.config.ts` · `vitest.config.e2e.ts` |

## Antes de editar

1. [`README.md`](./README.md) — helpers, ejemplos y umbrales de cobertura.
2. [`../docs/adr/0006-vitest-runner-tests.md`](../docs/adr/0006-vitest-runner-tests.md) — por qué Vitest y no Jest.
3. [`../docs/conventions.md`](../docs/conventions.md) §8 — reglas de tests.

## Reglas locales

- Un solo runner: Vitest. No agregar Jest, `ts-jest` ni `@types/jest`.
- Utilidades compartidas solo en `test/utils/`; nunca en `src/`.
- Unitarios sin PostgreSQL: repositorio y QueryBuilder mockeados.
- Crear los mocks en `beforeEach`; no compartir estado entre tests.
- Verificar llamadas con `toHaveBeenCalledWith`, no solo el resultado.
- Imports relativos con `.js`, también en `test/`.
- Si falta una operación de `Repository`, ampliar el helper; no duplicar mocks.
- Los e2e van en `test/*.e2e-spec.ts` y no requieren base por defecto.

## Verificación

```bash
npm test
npm run test:cov
npm run test:e2e
```
