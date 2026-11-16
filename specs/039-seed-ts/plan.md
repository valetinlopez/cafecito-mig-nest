# Plan — 039-seed-ts

## 1. Archivos

| Archivo                                    | Cambio                                                             |
| ------------------------------------------ | ------------------------------------------------------------------ |
| `src/database/seed-data.ts`                | Datos inmutables del legacy y tipos del seed.                      |
| `src/database/seed-runner.ts`              | Lógica transaccional, idempotencia por tabla y reporte.            |
| `src/database/seed.ts`                     | Entrada CLI: guard, `DataSource`, transacción y salida.            |
| `src/database/seed-guard.ts`               | Bloqueo de producción con confirmación explícita.                  |
| `src/database/seed-data.spec.ts`           | Congela el contenido y el formato de los datos.                    |
| `src/database/seed-runner.spec.ts`         | Base vacía, idempotencia, tabla parcial y categoría faltante.      |
| `src/database/seed-guard.spec.ts`          | Producción bloqueada y habilitada.                                 |
| `test/utils/in-memory-data-source.ts`      | Agrega `insert` al doble de repositorio (operación faltante).      |
| `test/utils/in-memory-data-source.spec.ts` | Cubre `insert` con asignación de id.                               |
| `package.json`                             | Script `seed` sobre `dist/` con `.env`.                            |
| `src/database/README.md`                   | Sección de seed y estructura.                                      |
| `src/database/DECISIONS.md`                | D-09: idempotencia, reutilización y guard.                         |
| `src/database/CONTRACT.md`                 | Aclara que el seed es un comando manual, no parte del módulo Nest. |
| `README.md`                                | Comando y advertencia de producción.                               |
| `specs/README.md`                          | Fila del índice para esta spec.                                    |
| `.agents/memory.md`                        | Estado y bitácora.                                                 |

## 2. Orden de implementación

1. Datos y guard (sin dependencias).
2. Runner transaccional + `insert` en el doble en memoria.
3. Entrada CLI y script npm.
4. Tests de datos, runner y guard.
5. Documentación y validación.

## 3. Estrategia de tests

- **Datos**: conteos, precios con dos decimales, categorías válidas, mesas 1–12.
- **Runner**: base vacía, doble ejecución, tabla parcial, categoría faltante,
  hash verificable con `bcrypt.compare` y orden de inserción.
- **Guard**: producción sin confirmación, producción confirmada, desarrollo.
- **Helper**: `insert` asigna ids y persiste varias filas.
- Sin PostgreSQL: el doble en memoria alcanza para la lógica. La ejecución real
  contra base se documenta como verificación manual.

## 4. Riesgos y mitigaciones

| Riesgo                                       | Mitigación                                                 |
| -------------------------------------------- | ---------------------------------------------------------- |
| Ejecutar el seed contra producción           | Guard por `NODE_ENV` + confirmación explícita.             |
| Dejar datos a medias                         | Toda la carga ocurre en `dataSource.transaction`.          |
| Duplicar datos en una re-ejecución           | Chequeo por tabla dentro de la transacción.                |
| Ids de categorías distintos a los del legacy | Resolución por nombre, nunca por id fijo.                  |
| Romper imports ESM                           | Todos los relativos con `.js`; gate de `typecheck`/`test`. |
| Tests con hash lento                         | Se hashea una sola vez por ejecución (no por usuario).     |

## 5. Verificación

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

La ejecución real `npm run seed` se intenta contra la base configurada en `.env`
(local). Si no hay PostgreSQL disponible, se reporta como no verificada.
