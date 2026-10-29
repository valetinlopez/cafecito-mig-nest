# Validate — 032-caja

> Validación realizada tras la implementación de MIG-32.

| Requisito           | Test / evidencia                                                                   | Resultado |
| ------------------- | ---------------------------------------------------------------------------------- | --------- |
| RF-01, RF-02, RF-09 | `caja.service.spec.ts` › advisory lock, apertura y rechazo duplicado               | Pasa      |
| RF-03, RF-04        | `caja.service.spec.ts` › null, total runtime e historial DESC                      | Pasa      |
| RF-05, RF-06        | `pagos.service.spec.ts` y `caja.service.spec.ts` › proyección/orden y 404          | Pasa      |
| RF-07, RF-08, RF-10 | `caja.service.spec.ts` › cierre con lock `pessimistic_write` y caja ausente        | Pasa      |
| RF-11, RF-12, RF-13 | `caja.dto.spec.ts` y `caja.e2e-spec.ts` › 422, 401 y 403                           | Pasa      |
| RNF-01, RNF-02      | `caja.entity.spec.ts`, `caja.dto.spec.ts` › columnas, decimal, UTC y total runtime | Pasa      |
| RNF-03, RNF-04      | `caja.e2e-spec.ts` › guard admin y paths con/sin barra                             | Pasa      |
| RNF-05, RNF-06      | `pagos.service.spec.ts` › SUM/COALESCE, proyección y agregación por lote           | Pasa      |

## Gates

- lint: OK (`npm run lint`)
- typecheck: OK (`npm run typecheck`)
- test: OK — 49 archivos, 333 tests (`npm test`)
- test:e2e: OK — 8 archivos passed, 1 skipped; 69 tests passed, 2 skipped (`npm run test:e2e`)

## VEREDICTO: IMPLEMENTACIÓN COMPLETA — REVISIÓN HUMANA PENDIENTE

No se ejecutó schema:log contra Neon ni se hizo DDL. La confirmación del
esquema real corresponde a MIG-44. No se modificó Jira, no se creó commit ni se
hizo push. El merge a `develop` queda a cargo del desarrollador.
