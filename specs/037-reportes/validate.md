# Validate — 037-reportes

| Requisito | Test / evidencia                                                                 | Resultado |
| --------- | -------------------------------------------------------------------------------- | --------- |
| RF-01     | `test/reportes.e2e-spec.ts` › `responde 200 con el shape contractual con y sin barra final` | Pasa |
| RF-02     | `src/reportes/reportes.service.spec.ts` › `agrega los cinco bloques con los tipos del driver normalizados` | Pasa |
| RF-03     | `src/reportes/reportes.service.spec.ts` › `no divide por cero cuando hay cobros sin pedidos distintos` | Pasa |
| RF-04     | `src/reportes/reportes.service.spec.ts` › `resuelve agrupaciones, orden y top 20 en la base` | Pasa |
| RF-05     | `src/reportes/reportes.service.spec.ts` › `resuelve agrupaciones, orden y top 20 en la base` | Pasa |
| RF-06     | `src/reportes/reportes.service.spec.ts` › `resuelve agrupaciones, orden y top 20 en la base` | Pasa |
| RF-07     | `src/reportes/reportes.service.spec.ts` › `excluye las cajas que no intersectan el período y suma el efectivo de la caja` | Pasa |
| RF-08     | `src/reportes/reportes.service.spec.ts` › `deja la diferencia en null para la caja abierta y la conserva negativa` | Pasa |
| RF-09     | `src/reportes/reportes.service.spec.ts` › `rechaza un período invertido con 400 y sin consultar la base` + e2e `propaga el 400 del service` | Pasa |
| RF-10     | `src/reportes/dto/reporte-ventas.dto.spec.ts` › `exige desde y hasta`, `exige el formato contractual YYYY-MM-DD`, `rechaza fechas inexistentes` + e2e `responde 422` | Pasa |
| RF-11     | `test/reportes.e2e-spec.ts` › `requiere autenticación y rol admin`                  | Pasa |
| RF-12     | `src/reportes/reportes.service.spec.ts` › `devuelve ceros y listas vacías cuando no hay ventas en el período` | Pasa |
| RNF-01    | `src/reportes/dto/reporte-ventas.dto.spec.ts` › `ensambla el shape contractual en snake_case` | Pasa |
| RNF-02    | `src/reportes/reportes.service.spec.ts` › `agrega los cinco bloques...` (fechas ISO UTC, montos `number`) | Pasa |
| RNF-03    | `src/reportes/reportes.service.spec.ts` › `resuelve agrupaciones, orden y top 20 en la base` | Pasa |
| RNF-04    | `test/reportes.e2e-spec.ts` › `responde 422 ...` y `propaga el 400 ...` (envelope `{ detail }`) | Pasa |
| RNF-05    | `src/common/time/business-timezone.spec.ts` + service › `consulta el período local inclusivo convertido a UTC semiabierto` | Pasa |
| CA-02     | Service › `deja la diferencia en null...` y `excluye las cajas que no intersectan...` | Pasa |
| CA-04     | Service › verificaciones de `groupBy`, `orderBy` y `limit`                        | Pasa |
| CA-05     | e2e › `requiere autenticación y rol admin`                                        | Pasa |

## Gates

| Gate        | Comando                        | Resultado |
| ----------- | ------------------------------ | --------- |
| lint        | `npm run lint`                 | OK        |
| typecheck   | `npm run typecheck`            | OK        |
| unitarios   | `npx vitest run --maxWorkers=2` | 452 tests, 57 archivos |
| e2e         | `npx vitest run --config ./vitest.config.e2e.ts --maxWorkers=2` | 87 tests, 11 archivos (2 skipped por base opcional) |

> En este entorno Windows `npm test` y `npm run test:e2e` fallan al lanzar
> workers en paralelo (`spawn UNKNOWN`), no por los tests. Con
> `--maxWorkers=2` la suite completa pasa. Se documenta para no confundirlo con
> una regresión.

## VEREDICTO: APROBADO
