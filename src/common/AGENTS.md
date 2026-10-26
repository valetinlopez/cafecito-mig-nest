# AGENTS.md — `common`

> Instrucciones locales de este directorio. Leelo antes de tocar `src/common/`.

| Campo      | Valor                                                      |
| ---------- | ---------------------------------------------------------- |
| Estado     | Implementado (MIG-20; guards en MIG-23/24)                 |
| Contrato   | [`./CONTRACT.md`](./CONTRACT.md) — garantías transversales |
| Decisiones | [`./DECISIONS.md`](./DECISIONS.md)                         |

## Antes de editar

1. [`README.md`](./README.md) — qué va y qué no en `common`.
2. [`CONTRACT.md`](./CONTRACT.md) — comportamiento esperado de cada pieza.
3. [`DECISIONS.md`](./DECISIONS.md) — un solo filtro, CORS y traducción.

## Reglas locales

- Solo infraestructura compartida por 2+ módulos; la lógica de negocio no va acá.
- Registro global con `APP_FILTER` / `APP_PIPE` / `APP_INTERCEPTOR` en
  `common.module.ts`; no repetir providers en `main.ts`.
- Guards con `@UseGuards` por controller; no `APP_GUARD` sin auditar `@Public()`.
- Sin barrels: imports al archivo concreto con `.js`.
- Un solo `numericTransformer` compartido; no copiarlo por módulo.
- No incluir utilidades de test en `src/` (van en `test/`).
- El 422 se arma en `validation-messages.ts`: no duplicar traducciones en DTOs.
- El envelope `{ detail }` se garantiza en el filtro, no en cada controller.
- Fechas: `timestamp without time zone` + `utcTimestampTransformer`; el DTO
  serializa con `toIsoUtc()` (ADR 0007). Nunca devolver un `Date` crudo.

## Verificación

```bash
npm test
npm run test:e2e
```
