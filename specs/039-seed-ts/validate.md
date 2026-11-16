# Validate — 039-seed-ts

> Fecha: 2026-11-04. Implementación y validación hechas por el mismo agente;
> **falta revisión humana**.

## Matriz de requisitos

| Requisito | Test / evidencia                                                        | Resultado |
| --------- | ----------------------------------------------------------------------- | --------- |
| RF-01     | `seed-runner.spec.ts` › `inserta los datos del legacy en una base vacía` | Pasa      |
| RF-02     | `seed-runner.spec.ts` › `inserta…` (`bcrypt.compare`, roles, activo)     | Pasa      |
| RF-03     | `seed-runner.spec.ts` › `inserta…` + `seed-data.spec.ts` › `asocia…`     | Pasa      |
| RF-04     | `seed-runner.spec.ts` › `inserta…` + `seed-data.spec.ts` › `numera…`     | Pasa      |
| RF-05     | `seed-runner.spec.ts` › `omite solo la tabla que ya tiene filas`         | Pasa      |
| RF-06     | `seed-runner.spec.ts` › `es idempotente: la segunda ejecución…`          | Pasa      |
| RF-07     | `seed-runner.spec.ts` › `falla sin insertar productos si falta…`         | Pasa      |
| RF-08     | Inspección: `dataSource.transaction` en `seed.ts`; rollback real no ejecutado | Parcial |
| RF-09     | `seed-guard.spec.ts` › los 4 casos de producción                         | Pasa      |
| RF-10     | `package.json` › `seed` + `npm run build`                                | Pasa      |
| RF-11     | Inspección: `describe()` en `seed.ts` resume sin hashes                  | Pasa      |
| RNF-01    | `seed.ts` importa `data-source.ts`; no hay opciones duplicadas           | Pasa      |
| RNF-02    | Sin dependencias nuevas; `synchronize: false` en el `DataSource`         | Pasa      |
| RNF-03    | `npm run lint` y `npm run typecheck`                                     | Pasa      |
| RNF-04    | Sin `console.log`; `Logger` de Nest en `seed-runner.ts` y `seed.ts`      | Pasa      |
| RNF-05    | Los tests usan `createInMemoryDataSource`, sin PostgreSQL                | Pasa      |

## Verificación de que los tests detectan fallas

| Mutación                                                     | Resultado        |
| ------------------------------------------------------------ | ---------------- |
| Quitar `isEmpty` de una tabla                                | Test de idempotencia falla |
| Resolver el producto con `categoriaId` fijo (1..4)           | Test de ids variables falla |
| No lanzar cuando falta la categoría                          | Test de FK faltante falla |
| Permitir producción con `SEED_ALLOW_PRODUCTION='1'`          | Test del guard falla |
| Reemplazar `bcrypt.hash` por la contraseña en claro          | Test de `bcrypt.compare` falla |

## Gates

| Gate      | Comando             | Resultado                                                |
| --------- | ------------------- | -------------------------------------------------------- |
| lint      | `npm run lint`      | OK                                                       |
| typecheck | `npm run typecheck` | OK                                                       |
| unitarios | `npm test`          | 524 tests, 64 archivos                                   |
| e2e       | `npm run test:e2e`  | 129 tests, 12 archivos + 1 omitido (2 tests de base real) |
| build     | `npm run build`     | OK                                                       |

> Los dos suites se corrieron en serie. En paralelo, en esta máquina, los
> `setupFiles` saturaron el tiempo de los hooks; los archivos afectados se
> repitieron aislados y pasaron.

## Lo que NO quedó verificado

- **Ejecución real de `npm run seed`:** el PostgreSQL local rechazó la
  autenticación (`password authentication failed for user "postgres"`). No se
  tocó ninguna base ni se modificó el `.env`.
- **Rollback real (RF-08):** la transacción está en el código, pero el doble en
  memoria no simula rollback. Verificar contra una base de desarrollo.
- **Restricciones reales:** unique de email/categoría/mesa y FK de productos
  solo se ejercitan contra PostgreSQL.
- **Concurrencia:** dos seeds simultáneos no se probaron; uno debería fallar por
  restricción y revertir.
- `test/database.e2e-spec.ts` sigue omitido (requiere `E2E_DATABASE=true`).

## VEREDICTO: APROBADO, con ejecución real pendiente

Los criterios automáticos (CA-01..CA-04, CA-06) están cubiertos. **CA-05** se
cumple. Falta la evidencia manual de CA-01/CA-02 sobre una base real y la
revisión humana del PR.
