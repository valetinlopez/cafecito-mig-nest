# AGENTS.md — `common`

> Instrucciones locales de este directorio. Leelo antes de tocar `src/common/`.

| Campo      | Valor                                                      |
| ---------- | ---------------------------------------------------------- |
| Estado     | Scaffolding (solo `.gitkeep`)                              |
| Contrato   | [`./CONTRACT.md`](./CONTRACT.md) — garantías transversales |
| Decisiones | [`./DECISIONS.md`](./DECISIONS.md)                         |

## Antes de editar

1. [`README.md`](./README.md) — qué va y qué no en `common`.
2. [`CONTRACT.md`](./CONTRACT.md) — comportamiento esperado de cada pieza.
3. [`DECISIONS.md`](./DECISIONS.md) — registro global y guards.

## Reglas locales

- Solo infraestructura compartida por 2+ módulos; la lógica de negocio no va acá.
- Registro global con `APP_FILTER` / `APP_PIPE` / `APP_INTERCEPTOR`.
- Guards con `@UseGuards` por controller; no `APP_GUARD` sin auditar `@Public()`.
- Sin barrels: imports al archivo concreto con `.js`.
- Un solo `numericTransformer` compartido; no copiarlo por módulo.
- No incluir utilidades de test en `src/` (van en `test/`).

## Verificación

```bash
npm test
npm run test:e2e
```
