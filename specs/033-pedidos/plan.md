# Plan — 033-pedidos

> Fase 3: estrategia técnica para la spec integral MIG-33; no amplía requisitos.

## 1. Enfoque

`PedidosService` coordina las operaciones y sus transacciones. Los repositorios
TypeORM se obtienen del `EntityManager` transaccional para no escribir fuera de
la unidad de trabajo. Controllers solo traducen HTTP y autentican; DTOs
serializan con `fromEntity()`.

- **Crear:** transacción; lock de mesa `pessimistic_write`; verificar mesa y
  pedido activo; agregar cantidades por producto; bloquear productos en orden
  ascendente, validar existencia/disponibilidad/stock; guardar pedido y detalles
  con precio histórico; descontar stock y poner mesa ocupada. Los detalles
  conservan el orden y las líneas originales.
- **Leer:** colección filtrada por estados activos y ordenada por fecha DESC;
  detalle por id; ambas consultas cargan `mesa`, `usuario`, `detalles` de forma
  explícita.
- **Transicionar:** transacción y lock de pedido; validar máquina de estados;
  al cancelar reponer stock de cada detalle, al entregar cambiar mesa a
  `pendiente_cobro`, al cancelar a `libre`, en los demás estados activos a
  `ocupada`. Actualizar efectos en la misma transacción.
- **Cobrar:** transacción; lock del pedido; validar entregado y método (DTO);
  resolver y bloquear caja abierta mediante CajaService; registrar Pago por
  pedido.total y usuario; marcar pedido pagado y mesa libre; releer el pedido
  hidratado antes de responder.
- **Mesas y compatibilidad:** actualizar provider `ACTIVE_ORDERS_PORT` para que
  consultas de mesas usen la regla activa implementada sin dependencia circular.

Orden de locks para crear: mesa primero; productos únicos por id ascendente.
Para transición: pedido primero y luego mesa/productos solo en cancelación.
Para cobro: pedido y luego caja, igual que el orden contractual. Pruebas deben
cobrir rollback, locks, concurrencia por mesa/producto/pedido y ausencia de
overselling.

## 2. Archivos y responsabilidades

| Archivo                                                                               | Acción            | Responsabilidad                                                                                                        |
| ------------------------------------------------------------------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `src/pedidos/pedidos.service.ts`                                                      | crear             | Consultas, creación, transición, cobro y consulta para mesas activas.                                                  |
| `src/pedidos/pedidos.service.spec.ts`                                                 | crear             | Unitarios de reglas, locks, stock, transiciones, pago y rollback.                                                      |
| `src/pedidos/pedidos.controller.ts`                                                   | crear             | Cinco rutas y guards/roles según contrato.                                                                             |
| `src/pedidos/pedidos.module.ts`                                                       | modificar         | Registrar controller/service y módulos necesarios sin ciclos.                                                          |
| `src/mesas/mesas.module.ts`                                                           | modificar         | Sustituir provider temporal `ACTIVE_ORDERS_PORT` por adapter de PedidosModule exportado, evitando dependencia inversa. |
| `src/mesas/active-orders.port.ts` y `mesas.service.ts`                                | revisar/modificar | Mantener el contrato de consulta de pedidos activos para las reglas actuales de mesa.                                  |
| `src/pagos/pagos.service.ts`                                                          | modificar         | `registrarPago(manager, input)` y `findByPedido(id, manager?)`; conservar consultas MIG-32.                            |
| `src/pagos/pagos.service.spec.ts`, `src/pagos/DECISIONS.md`                           | modificar         | Tests y registro de firma transaccional.                                                                               |
| DTO specs existentes                                                                  | modificar/crear   | Verificar forma y validación de Create/Update/Pago y campos extra.                                                     |
| `test/pedidos.e2e-spec.ts`                                                            | crear             | Contrato HTTP, auth, errores y shape de cinco rutas.                                                                   |
| `src/pedidos/README.md`, `CONTRACT.md`, `DECISIONS.md`                                | modificar         | Estado implementado, reglas y decisiones MIG-33.                                                                       |
| `specs/033-pedidos/*`, `specs/README.md`, `.agents/memory.md`, `docs/architecture.md` | modificar         | Evidencia y estado vivo de la entrega.                                                                                 |

No se cambia `docs/api-contract.md`, `docs/openapi.yaml`, entities ni esquema salvo que una discrepancia bloqueante requiera aprobación y una enmienda SDD.

## 3. Tareas

La descomposición ejecutable está en `tasks.md`: T1 validaciones/fixtures, T2
consultas y soporte de mesas, T3 creación transaccional, T4 transiciones y
cancelación, T5 pagos, T6 cobro atómico, T7 controller/E2E, T8 docs/gates.

## 4. Estrategia de pruebas

- Unitarios test-first, mocks de `DataSource.transaction`, `EntityManager`,
  repositories y `QueryBuilder` existentes en `test/utils/`.
- Verificar locks TypeORM (`setLock` o `lock: { mode: 'pessimistic_write' }`)
  y orden de locking de productos.
- Verificar atomicidad simulando fallas después de descontar stock y al cambiar
  mesa/pedido/pago.
- Cobertura table-driven de cada estado origen/destino y cascada correspondiente.
- E2E sin PostgreSQL según contrato: status, bodies, auth, validación, error
  envelope, barra final y responses anidadas.
- Al final de rama: `npm run lint`, `npm run typecheck`, `npm test`,
  `npm run test:e2e`, `npm run build`, `git diff --check`.

## 5. Riesgos

| Riesgo                                        | Mitigación                                                                                      |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Interacción con `ACTIVE_ORDERS_PORT` de Mesas | Adapter exportado desde PedidosModule; ningún ciclo `forwardRef`; probar compilación y módulos. |
| Venta concurrente de stock compartido         | Lock de productos en orden ascendente y descuento condicional dentro de transacción.            |
| Deadlocks por locks múltiples                 | Ordenar ids de producto; fijar orden de lock en cada flujo y cubrirlo con tests.                |
| Diferencias del esquema real                  | No DDL; mapear solo entities existentes y dejar verificación de esquema a MIG-44.               |
| Regresión de shape de stores                  | Comparar `PedidoResponseDto` y E2E con api-contract; no serializar entities.                    |
| Cancelación restaura stock más de una vez     | Lock del pedido, transición terminal y reponer solo al entrar en `cancelado`.                   |
