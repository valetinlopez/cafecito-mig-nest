# Tasks — 039-seed-ts

### T1 — Congelar los datos del legacy

- **Depends on:** —
- **Archivos:** `src/database/seed-data.ts`, `src/database/seed-data.spec.ts`
- **Hecho cuando:** `npm test -- seed-data` pasa y los conteos son 2/4/10/12.
- **Commit:** `T1: datos del seed del legacy`

### T2 — Ejecutar la carga de forma idempotente y transaccional

- **Depends on:** T1
- **Archivos:** `src/database/seed-runner.ts`, `seed-runner.spec.ts`,
  `test/utils/in-memory-data-source.ts`, `in-memory-data-source.spec.ts`
- **Hecho cuando:** los tests cubren base vacía, doble ejecución, tabla parcial y
  categoría faltante.
- **Commit:** `T2: runner del seed idempotente`

### T3 — Exponer el comando con bloqueo de producción

- **Depends on:** T2
- **Archivos:** `src/database/seed.ts`, `src/database/seed-guard.ts`,
  `seed-guard.spec.ts`, `package.json`
- **Hecho cuando:** `npm run build` compila y `npm test -- seed-guard` pasa.
- **Commit:** `T3: comando npm run seed`

### T4 — Documentar el seed

- **Depends on:** T3
- **Archivos:** `src/database/README.md`, `DECISIONS.md`, `CONTRACT.md`,
  `README.md`, `specs/README.md`, `.agents/memory.md`
- **Hecho cuando:** el comando, la idempotencia y el bloqueo de producción están
  documentados en un solo lugar y referenciados desde el índice.
- **Commit:** `T4: documentación del seed`
