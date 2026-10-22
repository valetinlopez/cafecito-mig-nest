# 0006 — Vitest como runner único de tests

| Campo     | Valor                   |
| --------- | ----------------------- |
| Estado    | Aceptado                |
| Fecha     | 2026-10-21              |
| Decisores | Equipo backend (3 devs) |
| Tags      | testing, tooling, dx    |

## Contexto

MIG-21 pide replicar la infraestructura de pytest del backend FastAPI y propone
**Jest** porque es el runner que trae el CLI de NestJS por defecto. Sin embargo,
el boilerplate de este repositorio ya está estandarizado sobre **Vitest 4**:

- `package.json` define `test`, `test:watch`, `test:cov`, `test:debug` y
  `test:e2e` con `vitest`.
- `vitest.config.ts` y `vitest.config.e2e.ts` existen, con `globals: true`,
  `vite-tsconfig-paths` y `test/setup-env.ts`.
- `AGENTS.md`, `docs/conventions.md` §8 y `docs/architecture.md` §10 ya declaran
  Vitest.
- Hay 12 specs (`77` tests) escritos con la API de Vitest (`vi.fn`, `vi.spyOn`).

El ticket también menciona `moduleNameMapper` para alias, una opción específica
de Jest. En este proyecto los alias de `tsconfig.json` los resuelve
`vite-tsconfig-paths`, el equivalente funcional.

## Decisión

**Vitest es el único runner de tests del proyecto.** No se instala Jest ni se
mantienen dos configuraciones. Las utilidades de MIG-21 se escriben contra la API
de Vitest y quedan tipadas con `Mock` de `vitest`.

Equivalencias para quien venga de Jest:

| Jest               | Vitest                      |
| ------------------ | --------------------------- |
| `jest.fn()`        | `vi.fn()`                   |
| `jest.spyOn()`     | `vi.spyOn()`                |
| `jest.Mocked<T>`   | `Mock<T>` de `vitest`       |
| `moduleNameMapper` | `vite-tsconfig-paths`       |
| `jest.config.js`   | `vitest.config.ts`          |
| `jest --coverage`  | `vitest run --coverage`     |
| `@types/jest`      | `types: ["vitest/globals"]` |

## Alternativas consideradas

| Alternativa               | Por qué se descarta                                                                 |
| ------------------------- | ----------------------------------------------------------------------------------- |
| Migrar todo a Jest        | Reescribir 12 specs, sumar `ts-jest`/`@types/jest` y pelear con ESM + TypeScript 6. |
| Convivir Jest y Vitest    | Dos runners, dos coberturas y confusión sobre dónde vive cada test.                 |
| Dejar el ticket como Jest | El ticket describe una herramienta, no un requisito funcional del producto.         |

## Consecuencias

**Positivas**

- Un solo runner, una sola config y una sola forma de mockear.
- ESM nativo y soporte directo de TypeScript 6 sin transformadores extra.
- `test:cov` usa `@vitest/coverage-v8`, ya instalado.

**Negativas / costos**

- Los ejemplos de Jest que aparezcan en documentación o skills se traducen con
  la tabla de arriba.
- `Mock<T>` de Vitest trabaja con la última sobrecarga de los métodos de
  TypeORM; si un mock necesita otra firma, se declara explícita en el helper.

## Implementación

- Scripts en `package.json` (`test`, `test:watch`, `test:cov`, `test:e2e`).
- Configs en `vitest.config.ts` y `vitest.config.e2e.ts`; la cobertura vive en la
  config unitaria.
- Helpers compartidos en `test/utils/`: `mock-repository.ts`,
  `mock-query-builder.ts` y `test-module.helper.ts`.
- Guía de uso y reglas en [`test/README.md`](../../test/README.md).

**Verificación:** `npm test`, `npm run test:cov` y `npm run test:e2e`.

## Referencias

- `AGENTS.md` §2
- `docs/conventions.md` §8
- `docs/architecture.md` §10
- Tickets MIG-21, MIG-19, MIG-20
