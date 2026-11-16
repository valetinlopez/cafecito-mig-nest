# Clarify — 039-seed-ts

## Ambigüedades detectadas y resueltas

| #   | Detección                                                                  | Resolución                                                                                           |
| --- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 1   | El ticket pide `src/seed.ts`; el repo ejecuta CLIs desde `dist/database/`. | `src/database/seed.ts` + `dist/database/seed.js`: reutiliza `data-source.ts` y el patrón de scripts. |
| 2   | "Idempotente" puede significar por fila o por tabla.                       | Por tabla, como el legacy: si la tabla tiene filas, se omite completa.                               |
| 3   | El ticket no define nombres de usuario, stock mínimo ni categoría.         | Se congelan desde `seed.py` vía `frontend-compat.fixtures.ts`.                                       |
| 4   | No se indica qué hacer si se apunta a producción por error.                | Bloqueo por `NODE_ENV=production`; se habilita solo con `SEED_ALLOW_PRODUCTION=true`.                |
| 5   | No se indica cómo resolver la FK de productos.                             | Búsqueda por nombre de categoría dentro de la misma transacción; ids variables permitidos.           |

## Decisiones que requieren confirmación humana

Ninguna bloquea la implementación. Quedan como supuestos en `spec.md` §8.
