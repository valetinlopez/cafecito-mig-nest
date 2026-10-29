# Tasks — 032-caja

> Una tarea por gate; no crear commits hasta que el usuario indique lo
> contrario. La aprobación de `spec.md` y sus supuestos es precondición.

## Precondiciones

- [x] Spec MIG-32 aprobada a partir del alcance explícito compartido.
- [x] Mapeo basado en el modelo legacy/documentación; sin ejecutar DDL ni
      alterar el esquema (validación real permanece en MIG-44).

## [x] T1 — Entity y DTOs de caja

- **Depends on:** Precondiciones
- **Archivos:** `src/caja/entities/`, `src/caja/dto/`
- **Hecho cuando:** tests de entity, validación de requests y response DTO pasan;
  `total_ventas` no está mapeado como columna.
- **Commit:** Omitido según instrucción del usuario; preparar cambios locales.

## [x] T2 — Proyección de movimientos y ventas

- **Depends on:** T1
- **Archivos:** `src/pagos/pagos.service.ts`, `src/pagos/pagos.service.spec.ts`
- **Hecho cuando:** `npm test -- pagos` pasa; movimientos se ordenan DESC,
  relacionan pedido/mesa/usuario y total sin pagos es cero.
- **Commit:** Omitido según instrucción del usuario; preparar cambios locales.

## [x] T3 — Servicio de lectura de caja

- **Depends on:** T1, T2
- **Archivos:** `src/caja/caja.service.ts`, `src/caja/caja.service.spec.ts`
- **Hecho cuando:** tests de caja abierta, historial DESC, total calculado,
  movimientos y caja inexistente pasan.
- **Commit:** Omitido según instrucción del usuario; preparar cambios locales.

## [x] T4 — Apertura y cierre transaccionales

- **Depends on:** T1, T3
- **Archivos:** `src/caja/caja.service.ts`, `src/caja/caja.service.spec.ts`
- **Hecho cuando:** tests verifican la apertura serializada sin DDL, errores
  contractuales y lock `pessimistic_write` al cerrar.
- **Commit:** Omitido según instrucción del usuario; preparar cambios locales.

## [x] T5 — Endpoints y autorización

- **Depends on:** T3, T4
- **Archivos:** `src/caja/caja.controller.ts`, `src/caja/caja.module.ts`,
  `test/caja.e2e-spec.ts`
- **Hecho cuando:** E2E cubre cinco endpoints, status/shapes, 401/403, 400/404,
  validación 422, JSON null literal y paths con/sin barra.
- **Commit:** Omitido según instrucción del usuario; preparar cambios locales.

## [x] T6 — Documentar y validar MIG-32

- **Depends on:** T1–T5
- **Archivos:** docs de `src/caja/`, `.agents/memory.md`,
  `specs/032-caja/validate.md`
- **Hecho cuando:** lint, typecheck, unitarios y e2e pasan; matriz RF tiene
  evidencia; el usuario recibe resumen y el trabajo se detiene a esperar
  confirmación antes de cualquier push.
- **Commit:** Omitido según instrucción del usuario; preparar cambios locales.
