# Validate — 033-pedidos

> Evidencia de implementación y gates. Veredicto pendiente de revisión final.

| Requisito           | Test / evidencia prevista                                                       | Resultado                                                                             |
| ------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| RF-01, RF-02        | `pedidos.service.spec.ts` — consulta activa ordenada; detalle/404               | Implementado; unitarios completos OK                                                  |
| RF-03, RF-04        | `pedidos.service.spec.ts` — mesa existente, activa y lock concurrente           | Parcial; mesa/lock probados, concurrencia DB no ejercida                              |
| RF-05, RF-06, RF-07 | `pedidos.service.spec.ts` — producto, agrupación, disponibilidad, stock y locks | Implementado; stock repetido/lock ascendente OK                                       |
| RF-08, RF-09        | `pedidos.service.spec.ts` — persistencia, mesa ocupada y rollback               | Implementado; fallos tardíos en mesa propagan error dentro del callback transaccional |
| RF-10, RF-11, RF-12 | `pedidos.service.spec.ts` — matriz de transiciones/cascadas/reposición          | Implementado; 36 pares estado-origen/destino, cascadas y reposición probados          |
| RF-13, RF-14        | `pedidos.service.spec.ts` — doble lock y condiciones de cobro                   | Implementado; pedido usa lock y CajaService prueba lock pesimista en manager          |
| RF-15, RF-16        | `pedidos.service.spec.ts` — pago atómico y rollback, total cero                 | Implementado; total cero y fallo al liberar mesa tras registrar el pago probados      |
| RF-17, RF-18        | DTO specs + `test/pedidos.e2e-spec.ts` — 422, 401, 403                          | Implementado; e2e completo OK                                                         |
| RNF-01..RNF-07      | `test/pedidos.e2e-spec.ts`, unitarios y gates                                   | Implementado; suites HTTP/unitarias y gates en verde                                  |

## Gates

- lint: OK (`npm run lint`)
- typecheck: OK (`npm run typecheck`)
- unitarios completos: OK (51 archivos, 390 tests)
- e2e completos: OK (9 archivos pasaron, 1 suite omitida; 74 tests pasaron, 2 omitidos)
- build ESM: OK (`npm run build`)
- `git diff --check`: OK (sin salida, exit code 0)

## Limitaciones de validación

- Los unit tests prueban que fallos tardíos se propagan desde el callback
  transaccional; no demuestran rollback real ni concurrencia de PostgreSQL. Eso
  requiere integración con DB y sigue fuera del alcance sin acceso al entorno.
- Una prueba unitaria no simula concurrencia real de PostgreSQL; el lock de mesa
  y producto se verifica por opciones TypeORM, sin test de integración DB.

## VEREDICTO: PENDIENTE

Todos los gates requeridos están en verde. Se conserva el veredicto pendiente
para revisión final: rollback físico y concurrencia real de PostgreSQL no se
ejercitaron; las pruebas confirman propagación de fallos dentro de los callbacks
transaccionales y configuración de locks, no ejecución real contra la base.
