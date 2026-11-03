# Validate — 035-regresion-services

> Validación ejecutada el 2026-11-02. Se mantiene Vitest como único runner; no se
> implementan Reportes ni DELETE de productos en este ticket.

| Requisito | Test / evidencia | Resultado |
| --------- | ---------------- | --------- |
| RF-01/02 | Mesas: estados y limpieza | Pasa |
| RF-03 | Productos: 422 y defaults | Pasa |
| RF-04/05 | Pedidos: errores/locks; caja: lock | Pasa |
| RF-06/07 | Caja: cierre, historial, movimientos, cero | Pasa |
| RF-08 | Dashboard: caja más reciente | Pasa |
| RF-09 | Decimales: 7 shapes JSON number | Pasa |
| RF-10 | Pool: timeout y handler | Pasa |
| RF-11 | Services: 93.69 % líneas | Pasa |

## Gates

- lint: OK (`npm run lint`)
- typecheck: OK (`npm run typecheck`)
- unitarios: OK (53 archivos, 411 tests)
- e2e: OK (10 archivos; 82 tests pasaron, 2 omitidos)
- build: OK (`npm run build`)
- cobertura global: 93.43 % statements, 85.76 % branches, 94.68 % functions, 93.75 % lines
- cobertura de líneas services: 93.69 % (416/444)
- `git diff --check`: OK

La cobertura se midió con Vitest V8. El cálculo específico de services agrega
las líneas ejecutables reportadas en `coverage/lcov.info` para archivos cuyo
nombre termina en `.service.ts`. Locks verificados con mocks; no se ejecutó
PostgreSQL real.

## VEREDICTO: PENDIENTE DE REVISIÓN HUMANA
