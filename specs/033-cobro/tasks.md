# Tasks — 033-cobro

> Fase 4 sobre [`plan.md`](./plan.md). Una tarea = un commit `Tn:` = un gate
> corrido.

## Precondiciones

| #   | Precondición                                   | Ticket | Estado    |
| --- | ---------------------------------------------- | ------ | --------- |
| P1  | Entities `Pedido` y `DetallePedido` mergeadas  | MIG-30 | En curso  |
| P2  | `CajaService.findAbierta(manager?)` disponible | MIG-32 | Pendiente |
| P3  | Esquema de `pagos`/`cajas` confirmado           | MIG-44 | Pendiente |

Ninguna tarea arranca hasta que P1 esté en `develop`.

---

## T1 — DTO de cobro con enum cerrado

- [ ] **Depends on:** P1
- **Archivos:** `src/pedidos/dto/pedido-pago.dto.ts`,
  `src/pedidos/dto/pedido-pago.dto.spec.ts`
- **Hecho cuando:** `npm test -- pedido-pago` pasa y el test
  `rechaza un método de pago fuera del enum` está en verde (`422`).
- **Commit:** `T1: DTO de cobro con método de pago validado`

## T2 — `PagosService` persiste con el manager del cobro

- [ ] **Depends on:** P1
- **Archivos:** `src/pagos/pagos.service.ts`, `src/pagos/pagos.service.spec.ts`,
  `src/pagos/DECISIONS.md`
- **Hecho cuando:** `npm test -- pagos` pasa y los tests
  `registra el pago con el monto y la caja recibidos` y
  `devuelve el pago del pedido o null` están en verde.
- **Commit:** `T2: PagosService registrarPago y findByPedido`

## T3 — Validaciones de pedido y estado

- [ ] **Depends on:** T2
- **Archivos:** `src/pedidos/pedidos.service.ts`,
  `src/pedidos/pedidos.service.spec.ts`
- **Hecho cuando:** `npm test -- pedidos` pasa y los tests
  `responde 404 si el pedido no existe` y
  `rechaza el cobro si el pedido no está entregado` (tabla de estados) están en
  verde.
- **Commit:** `T3: validaciones de cobro en PedidosService`

## T4 — Validación de caja abierta

- [ ] **Depends on:** T3, P2
- **Archivos:** `src/pedidos/pedidos.service.ts`,
  `src/pedidos/pedidos.service.spec.ts`
- **Hecho cuando:** `npm test -- pedidos` pasa y el test
  `rechaza el cobro si no hay caja abierta` está en verde con el mensaje del
  contrato.
- **Commit:** `T4: rechazo de cobro sin caja abierta`

## T5 — Transacción atómica de las tres escrituras

- [ ] **Depends on:** T4
- **Archivos:** `src/pedidos/pedidos.service.ts`,
  `src/pedidos/pedidos.service.spec.ts`
- **Hecho cuando:** `npm test -- pedidos` pasa y los tests
  `registra el pago, marca pagado y libera la mesa` y
  `revierte las tres escrituras si falla la liberación de la mesa` están en
  verde.
- **Commit:** `T5: cobro atómico pago + estado + mesa`

## T6 — Concurrencia y pago duplicado

- [ ] **Depends on:** T5
- **Archivos:** `src/pedidos/pedidos.service.ts`,
  `src/pedidos/pedidos.service.spec.ts`
- **Hecho cuando:** `npm test -- pedidos` pasa y los tests
  `bloquea el pedido con pessimistic_write` y
  `traduce la violación 23505 a 400` están en verde.
- **Commit:** `T6: lock pesimista y pago único`

## T7 — Endpoint `POST /pedidos/:id/pago`

- [ ] **Depends on:** T6
- **Archivos:** `src/pedidos/pedidos.controller.ts`,
  `src/pedidos/pedidos.module.ts`, `test/pedidos.e2e-spec.ts`
- **Hecho cuando:** `npm run test:e2e` pasa y el e2e cubre `200`, `401`, `403`,
  `404`, `400`, `422` y el path con barra final.
- **Commit:** `T7: controller de cobro con guard admin`

## T8 — Documentación y validación

- [ ] **Depends on:** T7
- **Archivos:** `src/pedidos/README.md`, `src/pedidos/CONTRACT.md`,
  `src/pedidos/DECISIONS.md`, `.agents/memory.md`,
  `specs/033-cobro/validate.md`
- **Hecho cuando:** `npm run lint`, `npm run typecheck`, `npm test` y
  `npm run test:e2e` pasan; `validate.md` tiene la matriz RF completa y el
  veredicto del reviewer.
- **Commit:** `T8: docs del cobro y validación SDD`

---

## Checklist de cierre

```
[ ] T1..T8 en [x] y un commit por tarea
[ ] npm run lint        [ ] npm run typecheck
[ ] npm test            [ ] npm run test:e2e
[ ] validate.md con VEREDICTO: APROBADO
[ ] memoria y docs del módulo actualizados
```
