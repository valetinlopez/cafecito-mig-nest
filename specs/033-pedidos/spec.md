# Spec 033 — Gestión integral de pedidos

| Campo   | Valor                                                                                                    |
| ------- | -------------------------------------------------------------------------------------------------------- |
| Ticket  | MIG-33                                                                                                   |
| Epic    | MIG-8 — E6: Módulo Pedidos                                                                               |
| Estado  | Aprobada para implementación — alcance integral confirmado por el usuario                                |
| Alcance | Consultar, crear, transicionar y cobrar pedidos de forma consistente con mesas, productos, caja y pagos. |

## 1. Contexto

La operación gastronómica necesita gestionar el ciclo completo de un pedido:
crear una comanda con stock reservado, avanzar sus estados y cobrarla sin dejar
inconsistencias entre pedido, inventario, mesa y caja. Las operaciones que
modifican más de un recurso deben ser atómicas y preservar el contrato que
consumen `pedidoStore.ts` y `carritoStore.ts`.

## 2. Fuera de alcance

- Cobros parciales, propinas, descuentos, impuestos, devoluciones y anulación de pagos.
- Apertura/cierre e historial de caja (MIG-32).
- Cambios al contrato global de API o al frontend.
- Cambios de esquema, migraciones o DDL; la comprobación de esquema sigue en MIG-44.
- Reportes y consultas de pedidos pagados/cancelados fuera de los endpoints definidos.

## 3. Historia de usuario

**Como** usuario del salón y administrador de caja, **quiero** crear pedidos,
actualizar su estado y cobrarlos, **para** mantener sincronizados el inventario,
las mesas y las ventas.

## 4. Requisitos funcionales

- **RF-01** CUANDO un usuario autenticado consulta la colección de pedidos, EL
  SISTEMA DEBE responder `200` con los pedidos activos (`pendiente`,
  `en_preparacion`, `listo`, `entregado`) y el shape contractual completo,
  ordenados por fecha descendente.
- **RF-02** CUANDO un usuario autenticado consulta un pedido existente por id,
  EL SISTEMA DEBE responder `200` con `Pedido` y sus relaciones `mesa`,
  `usuario` y `detalles`; SI no existe, ENTONCES EL SISTEMA DEBE responder `404`
  con `Pedido no encontrado`.
- **RF-03** CUANDO un usuario autenticado crea un pedido, EL SISTEMA DEBE
  bloquear la mesa para serializar creaciones concurrentes sobre ella, verificar
  que existe y rechazar la operación con `400` si no existe o ya tiene un
  pedido activo, usando los mensajes definidos en el contrato.
- **RF-04** CUANDO se crean pedidos concurrentes para la misma mesa, EL SISTEMA
  DEBE permitir como máximo uno mientras haya un pedido activo para esa mesa.
- **RF-05** CUANDO un pedido contiene productos, EL SISTEMA DEBE verificar que
  cada producto existe y está disponible; SI falta o no está disponible,
  ENTONCES DEBE responder `400` con el mensaje contractual del producto.
- **RF-06** CUANDO varios renglones del pedido refieren al mismo producto, EL
  SISTEMA DEBE sumar sus cantidades para validar y descontar el stock agregado,
  conservando en el pedido cada renglón recibido y su subtotal individual.
- **RF-07** CUANDO se crea un pedido, EL SISTEMA DEBE bloquear las filas de
  productos involucrados, comprobar stock suficiente y descontarlo dentro de la
  misma transacción; SI falta stock, DEBE responder `400` con
  `Stock insuficiente para 'X' (disponible: A, solicitado: B)`.
- **RF-08** CUANDO se crea un pedido válido, EL SISTEMA DEBE calcular cada
  subtotal como precio vigente por cantidad, calcular el total como suma de los
  subtotales, persistir pedido y detalles y cambiar la mesa a `ocupada` en una
  sola transacción; la respuesta es `201` con el pedido y relaciones cargadas.
- **RF-09** SI una etapa de creación falla, ENTONCES EL SISTEMA NO DEBE dejar
  cambios parciales en pedido, detalles, stock ni mesa.
- **RF-10** CUANDO un usuario autenticado actualiza el estado de un pedido, EL
  SISTEMA DEBE permitir únicamente las transiciones `pendiente →
en_preparacion|cancelado`, `en_preparacion → listo|cancelado`, `listo →
entregado|cancelado` y `entregado → cancelado`; `pagado` y `cancelado` son
  terminales y `pagado` solo puede alcanzarse mediante cobro.
- **RF-11** SI se solicita una transición no permitida, ENTONCES EL SISTEMA
  DEBE responder `400` con `No se puede cambiar el estado de 'X' a 'Y'`.
- **RF-12** CUANDO el estado pasa a `entregado`, EL SISTEMA DEBE cambiar la
  mesa a `pendiente_cobro`; cuando pasa a `cancelado`, DEBE liberarla (`libre`)
  y reponer el stock asociado al pedido; cuando pasa a otro estado activo,
  DEBE dejarla `ocupada`. El cambio y sus efectos son atómicos.
- **RF-13** CUANDO un administrador cobra un pedido `entregado`, EL SISTEMA
  DEBE bloquear el pedido con `pessimistic_write`, verificar el estado y
  bloquear la fila de la caja abierta con el mismo modo para excluir un cierre
  concurrente.
- **RF-14** SI el pedido no existe, no está `entregado` o no hay caja abierta,
  ENTONCES EL SISTEMA DEBE responder respectivamente `404 Pedido no encontrado`
  o `400` con el mensaje contractual de estado/caja; no debe crear un pago.
- **RF-15** CUANDO el cobro es válido, EL SISTEMA DEBE en una sola transacción
  registrar un pago por el total del pedido con método recibido, caja abierta y
  usuario autenticado; cambiar pedido a `pagado`, mesa a `libre` y responder
  `200` con el `Pedido` completo actualizado. Se permite total cero.
- **RF-16** SI falla cualquier paso del cobro, ENTONCES EL SISTEMA NO DEBE
  dejar pago, cambio de estado ni liberación de mesa parciales.
- **RF-17** CUANDO se envía un método de pago ajeno a
  `efectivo|debito|credito|transferencia|mercado_pago`, EL SISTEMA DEBE
  responder `422` con `{ "detail": "..." }`.
- **RF-18** SI falta autenticación válida, EL SISTEMA DEBE responder `401` en
  todos los endpoints; SI el endpoint es cobro y el rol no es `admin`, DEBE
  responder `403`.

## 5. Requisitos no funcionales

- **RNF-01** Los endpoints conservan los paths, códigos, nombres y shapes de
  `docs/api-contract.md` §6.5; JSON en `snake_case`.
- **RNF-02** `total` y `subtotal` se exponen como `number`; `fecha` como ISO-8601
  UTC con `Z`.
- **RNF-03** Ninguna respuesta serializa entities; se construye con
  `PedidoResponseDto.fromEntity()` y DTOs anidados.
- **RNF-04** Los errores mantienen el envelope `{ "detail": "..." }` y
  validación HTTP `422`.
- **RNF-05** Las listas, filtros y ordenamientos se resuelven en base de datos;
  las relaciones de respuesta se hidratan explícitamente sin N+1.
- **RNF-06** GET/POST/PATCH requieren usuario autenticado; solo
  `POST /pedidos/{id}/pago` requiere además rol `admin`.
- **RNF-07** Cada transición compuesta (crear/cancelar/entregar/cobrar) usa una
  transacción que agrupa todos sus efectos relacionados.

## 6. Casos límite y errores

| Caso                                                     | Resultado                                                                      |
| -------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Mesa inexistente                                         | `400`, `Mesa N no encontrada`                                                  |
| Mesa con pedido activo                                   | `400`, `La mesa ya tiene un pedido activo`                                     |
| Producto inexistente/no disponible                       | `400`, `Producto N no encontrado` / `Producto N no disponible`                 |
| Stock insuficiente, incluido producto repetido           | `400`, mensaje con stock disponible y cantidad total solicitada                |
| Pedido inexistente en GET/PATCH/cobro                    | `404`, `Pedido no encontrado`                                                  |
| Transición inválida o pagado manual                      | `400`, `No se puede cambiar el estado de 'X' a 'Y'`                            |
| Cobro sin caja abierta                                   | `400`, `No se puede cobrar un pedido sin una caja abierta`                     |
| Request inválido                                         | `422`, envelope `{ "detail": "..." }`                                          |
| Sin token / rol no admin al cobrar                       | `401` / `403`                                                                  |
| Falla durante una operación transaccional                | Rollback de todos los cambios de esa operación                                 |
| Pedido cancelado                                         | Se restaura el stock una sola vez; estado final terminal                       |
| Dos pedidos simultáneos para una mesa / un producto      | Los locks serializan operación y no exceden stock ni dejan dos pedidos activos |
| Dos cobros simultáneos del mismo pedido o cierre de caja | Pedido/caja bloqueados; no hay doble cobro ni cobro durante cierre             |

## 7. Criterios de aceptación

- **CA-01** Crear pedido válido descuenta stock, guarda subtotales/totales y deja
  mesa `ocupada`; error intermedio revierte todo.
- **CA-02** Las transiciones permitidas y cascadas a mesa coinciden exactamente
  con RF-10/RF-12; no es posible marcar `pagado` vía PATCH.
- **CA-03** Cobro requiere `entregado`, usa ambos locks pesimistas y una sola
  transacción para pago, estado y mesa.
- **CA-04** Los cinco endpoints respetan autorización, status, errores y shape
  compatible con `pedidoStore.ts`/`carritoStore.ts`.
- **CA-05** La colección lista solo estados activos; detalle inexistente
  responde 404.
- **CA-06** Producto repetido conserva sus renglones, pero stock se valida y
  descuenta por cantidad agregada; no hay overselling concurrente.

## 8. Supuestos y decisiones confirmadas

- Pedido activo: `pendiente`, `en_preparacion`, `listo` o `entregado`.
- Total cero se acepta en el cobro.
- Producto repetido conserva cada detalle de request; suma sus cantidades para
  validar y descontar inventario.
- Se bloquean productos en orden ascendente de id para reducir deadlocks entre
  pedidos que comparten varios productos.
- Cancelar repone el stock de los detalles en la misma transacción; decisión
  existente `src/pedidos/DECISIONS.md` D-06 confirmada por el usuario.
- No se cambia el contrato global ni el esquema de base.

## 9. Referencias

- Descripción completa de MIG-33 proporcionada por el usuario.
- `docs/api-contract.md` §6.5 y `docs/glossary.md` §3.1.
- `src/pedidos/README.md`, `CONTRACT.md` y `DECISIONS.md`.
- `src/caja/DECISIONS.md` D-02/D-03; `src/pagos/DECISIONS.md`.
- ADR 0001, 0002, 0003, 0004, 0005 y 0007.
