# Validate — 033-cobro

> Fase 6 sobre [`spec.md`](./spec.md). **Alcance de esta validación:** gate de
> especificación (S2). La implementación no se ejecutó porque depende de
> P1 (MIG-30: entities `Pedido` y `DetallePedido`), que está en curso. El gate
> de código (S3) se emite en el PR de MIG-33.

| Campo    | Valor                              |
| -------- | ---------------------------------- |
| Fecha    | 2026-10-29                         |
| Revisor  | `reviewer` (revisión independiente) |
| Alcance  | Especificación y plan              |
| Ticket   | MIG-33 (recorte "cobro")           |

---

## 1. Matriz requisito → evidencia

| Requisito | Evidencia (test propuesto)                                                     | Tarea | Estado |
| --------- | ------------------------------------------------------------------------------ | ----- | ------ |
| RF-01     | `pedidos.service.spec.ts` › `cobra un pedido entregado y devuelve el DTO en estado pagado` | T5 | Planificado |
| RF-02     | `pedidos.service.spec.ts` › `responde 404 si el pedido no existe`               | T3 | Planificado |
| RF-03     | `pedidos.service.spec.ts` › `rechaza el cobro si el pedido no está entregado`   | T3 | Planificado |
| RF-04     | `pedidos.service.spec.ts` › `rechaza el cobro si no hay caja abierta`           | T4 | Planificado |
| RF-05     | `pedido-pago.dto.spec.ts` › `rechaza un método de pago fuera del enum`          | T1 | Planificado |
| RF-06     | `pedidos.service.spec.ts` › `registra el pago por el total del pedido y el usuario autenticado` | T5 | Planificado |
| RF-07     | `pedidos.service.spec.ts` › `marca el pedido pagado y libera la mesa`           | T5 | Planificado |
| RF-08     | `pedidos.service.spec.ts` › `revierte las tres escrituras si falla la liberación de la mesa` | T5 | Planificado |
| RF-09     | `pedidos.service.spec.ts` › `bloquea el pedido con pessimistic_write` + `traduce la violación 23505 a 400` | T6 | Planificado |
| RF-10     | `test/pedidos.e2e-spec.ts` › `401 sin token` + `403 con rol mozo`               | T7 | Planificado |
| RF-11     | `test/pedidos.e2e-spec.ts` › `devuelve el shape Pedido sin password_hash`       | T7 | Planificado |
| RNF-01    | e2e › status `200`                                                              | T7 | Planificado |
| RNF-02    | e2e › `total` y `monto` como `number`                                           | T7 | Planificado |
| RNF-03    | e2e › `fecha` termina en `Z`                                                    | T7 | Planificado |
| RNF-04    | unitarios de error › `{ detail }` y códigos del contrato                        | T3, T4 | Planificado |
| RNF-05    | unitario › una sola `dataSource.transaction` y rollback                         | T5 | Planificado |
| RNF-06    | unitario › relectura con `relations` explícitas                                 | T5 | Planificado |
| RNF-07    | `pedidos.controller.ts` › `@Roles('admin')` + `@ApiBearerAuth()`               | T7 | Planificado |

No hay RF sin evidencia planificada.

---

## 2. Gates ejecutados (repositorio)

Estos gates validan el arnés y que el cambio de MIG-45 no rompe el backend:

| Gate                | Comando               | Resultado |
| ------------------- | --------------------- | --------- |
| Lint                | `npm run lint`        | OK        |
| Typecheck           | `npm run typecheck`   | OK        |
| Unitarios           | `npm test`            | 266 pasan (38 archivos) |
| Contrato HTTP       | `npm run test:e2e`    | 65 pasan, 2 skip (smoke DB) |
| Build ESM           | `npm run build`       | OK        |

---

## 3. Revisión de la cadena de artefactos

| Control                                                        | Resultado |
| -------------------------------------------------------------- | --------- |
| Todos los RF en EARS y con id estable                          | Sí        |
| Fuera de alcance explícito                                     | Sí (§2)   |
| Casos límite y errores cubiertos                               | Sí (§6)   |
| RNF verificables (status, shape, decimales, fechas, auth)      | Sí (§5)   |
| Hallazgos `Alta` abiertos en `clarify.md`                      | 0         |
| Plan mapea cada RF a archivo y test                            | Sí        |
| Tareas ≤ 10, con `Depends on` y "Hecho cuando" verificable      | Sí (8)    |
| Dependencias externas declaradas                               | Sí (MIG-30, MIG-32, MIG-44) |
| Cambios de contrato o constitución en el diff                  | Ninguno   |

---

## 4. Observaciones

1. **S-04 (total = 0):** sigue pendiente de confirmación de producto. No bloquea
   el plan porque el supuesto está escrito y es reversible con un RF nuevo.
2. **F-05 (pago preexistente con pedido `entregado`):** la prevalidación
   `findByPedido` y la traducción de `23505` a `400` están en T2 y T6; el mensaje
   exacto se fija al implementar y se registra en `DECISIONS.md`.
3. **P2 (caja):** si MIG-32 no expone `findAbierta(manager?)`, T4 lo resuelve con
   el repositorio dentro del manager y lo documenta; no cambia el contrato.

---

## 5. VEREDICTO

**`APROBADO`** para implementación (gate S2).

La especificación está lista: requisitos verificables, plan trazable y tareas
atómicas. El gate S3 (código + evidencia real de los tests) se emite en el PR de
MIG-33, cuando P1 esté mergeado, con esta misma matriz completada con resultados
`Pasa`/`Falla`.

**Siguiente:** `/sdd-implement 033-cobro T1` (bloqueado por P1).
