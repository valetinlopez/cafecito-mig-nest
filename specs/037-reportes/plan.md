# Plan — 037-reportes

## 1. Enfoque

Módulo de solo lectura con cinco agregaciones SQL independientes ejecutadas en
paralelo. El período se resuelve una sola vez, en un helper compartido de zona
horaria, y se pasa a los cinco bloques como intervalo UTC semiabierto.

Se extrae la conversión de fecha de negocio a `src/common/time/business-timezone.ts`
porque `dashboard` ya tenía esa lógica y `reportes` necesita exactamente la
misma matemática: una sola implementación, dos consumidores. `dashboard` se
refactoriza para usarla sin cambiar su comportamiento (sus tests lo verifican).

## 2. Archivos

| Archivo                                                        | Cambio                                              |
| -------------------------------------------------------------- | --------------------------------------------------- |
| `src/common/time/business-timezone.ts`                         | Nuevo: rango de día y de período en UTC             |
| `src/common/time/business-timezone.spec.ts`                    | Nuevo: límites, inclusividad y fechas inválidas     |
| `src/dashboard/dashboard.service.ts`                           | Refactor: usa el helper compartido                  |
| `src/reportes/dto/reporte-ventas-query.dto.ts`                 | Nuevo: `desde`/`hasta` con validación 422           |
| `src/reportes/dto/reporte-ventas-response.dto.ts`              | Nuevo: shape contractual + `fromData`               |
| `src/reportes/dto/reporte-ventas.dto.spec.ts`                  | Nuevo: validación y mapeo                           |
| `src/reportes/reportes.service.ts`                             | Nuevo: orquestación y cinco agregaciones            |
| `src/reportes/reportes.service.spec.ts`                        | Nuevo: con datos, vacío, cajas y `400`              |
| `src/reportes/reportes.controller.ts`                          | Nuevo: `GET /reportes/ventas` con guard admin       |
| `src/reportes/reportes.module.ts`                              | Registra repositorios, controller y service         |
| `test/reportes.e2e-spec.ts`                                    | Nuevo: contrato HTTP, 401/403/422/400               |
| `test/utils/mock-query-builder.ts`                             | Amplía `addGroupBy` para las nuevas queries         |
| `src/reportes/{AGENTS,README,CONTRACT,DECISIONS}.md`           | Estado y decisiones                                 |
| `specs/037-reportes/*`                                          | Este ciclo SDD                                      |
| `docs/architecture.md`, `.agents/memory.md`, `specs/README.md` | Estado del proyecto                                 |

## 3. Orden de implementación

1. Helper de zona horaria + refactor de `dashboard` (base de todo el rango).
2. DTOs de request y response (fija el contrato antes de consultar).
3. Service: resumen y métodos → productos y mesas → cajas y `diferencia`.
4. Controller y módulo con guard `admin`.
5. e2e del contrato HTTP.
6. Documentación y veredicto SDD.

## 4. Decisiones de consulta

| Bloque              | Raíz            | Filtro / agregado                                                        |
| ------------------- | --------------- | ------------------------------------------------------------------------ |
| Resumen             | `pagos`         | `SUM(monto)`, `COUNT(id)`, `COUNT(DISTINCT pedido_id)`                   |
| Ventas por método   | `pagos`         | `GROUP BY metodo_pago`, `ORDER BY total DESC`                            |
| Productos           | `detalle_pedidos` | joins a pedido, pago y producto; `LIMIT 20`                            |
| Mesas               | `pedidos`       | joins a mesa y pago; `GROUP BY mesa`, `ORDER BY cantidad DESC`           |
| Cajas               | `cajas`         | `LEFT JOIN pagos` para `ventas_efectivo`; filtro de intersección         |

## 5. Riesgos y mitigaciones

| Riesgo                                                              | Mitigación                                                                    |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Corte de zona horaria que pierde el turno noche                     | Helper compartido y tests de límites inclusivos (23:59 local entra).          |
| División por cero en `ticket_promedio`                              | Guard explícito con `cantidad_cobros === 0`.                                  |
| `numeric` llega como string desde `pg`                              | `Number()` en el service y `number` en el DTO; tests con strings del driver.  |
| Fechas crudas sin transformer                                       | Normalización con `Date`/`parseUtcTimestamp` + `toIsoUtc`.                     |
| Ruido de coma flotante en `diferencia`                              | Redondeo a dos decimales.                                                      |
| Query pesada que bloquea el event loop                              | Agregación en SQL y cinco consultas en paralelo; sin materializar filas.       |
| Romper `dashboard` al mover la lógica de fechas                     | Refactor sin cambio de contrato y suite de `dashboard` en verde.               |

## 6. Estrategia de test

- **Unitarios del service**: cinco bloques con datos, período vacío, cajas
  abiertas/cerradas, diferencia negativa, `400` sin tocar repositorios.
- **Unitarios de DTO**: faltantes (`es obligatorio`), formato (`YYYY-MM-DD`) y
  fecha inexistente (`2026-02-30`).
- **Unitarios del helper**: día de negocio, período inclusivo, fin de mes/año.
- **e2e**: `200` con y sin barra final, `401`, `403`, `422` y `400`.

## 7. Fuera del plan

- No se toca `docs/api-contract.md` ni `docs/openapi.yaml`: el contrato no cambia.
- No se agregan dependencias.
- No se crean entities ni migraciones.
