# Validate — 034-dashboard

> Validación de implementación completada el 2026-11-02. Pendiente de revisión
> final humana del veredicto SDD.

| Requisito | Test / evidencia | Resultado |
| --------- | ---------------- | --------- |
| RF-01 | `test/dashboard.e2e-spec.ts` › shape contractual y status | Pasa |
| RF-02 | `dashboard.service.spec.ts` › intervalo local semiabierto convertido a UTC y `SUM`/`COUNT` SQL | Pasa |
| RF-03 | `dashboard.service.spec.ts` › agregaciones SQL por estado de mesas | Pasa |
| RF-04 | `dashboard.service.spec.ts` › filtra estados activos y mapea sus conteos | Pasa |
| RF-05, RF-06 | `dashboard.service.spec.ts` › caja ausente y selección de la más reciente entre varias | Pasa |
| RF-07 | `dashboard.service.spec.ts` › suma cantidades, joins, orden determinista y límite 50 | Pasa |
| RF-08 | `dashboard.service.spec.ts` › ceros, colección vacía y nulos explícitos | Pasa |
| RF-09 | `test/dashboard.e2e-spec.ts` › admin, token ausente y rol mozo | Pasa |
| RNF-01 | `test/dashboard.e2e-spec.ts` › shape snake_case exacto | Pasa |
| RNF-02 | `dashboard.service.spec.ts` › montos number y fecha ISO UTC; caja nula | Pasa |
| RNF-03 | `dashboard.service.spec.ts` › proyecciones agregadas SQL y limit/order DB | Pasa |
| RNF-04 | E2E de auth y DTO explícito sin serialización de entities | Pasa |

## Gates

- lint: OK (`npm run lint`)
- typecheck: OK (`npm run typecheck`)
- unitarios: OK (52 archivos, 396 tests)
- e2e: OK (10 archivos pasaron, 1 suite omitida; 76 pasaron, 2 omitidos)
- build: OK (`npm run build`)
- `git diff --check`: OK

## VEREDICTO: PENDIENTE DE REVISIÓN HUMANA

Los requisitos y gates tienen evidencia en verde. No se conectó una base real;
las agregaciones se verificaron mediante assertions sobre QueryBuilder mockeado,
y el E2E valida HTTP/autorización con el service sustituido. No se ejecutó el
flujo contra PostgreSQL/Neon. El revisor puede cambiar el veredicto tras la
revisión final.