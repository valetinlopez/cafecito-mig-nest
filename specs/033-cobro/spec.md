# Spec 033 — Cobro atómico de un pedido

| Campo   | Valor                                                                                             |
| ------- | ------------------------------------------------------------------------------------------------- |
| Ticket  | MIG-33 (`Pedido Service: crear, transiciones, cobro atómico + Controller`) — recorte "cobro"      |
| Epic    | MIG-8 — E6: Módulo Pedidos                                                                        |
| Sprint  | S3 — Pedidos, Pagos & Caja                                                                        |
| Estado  | Reemplazada por [`033-pedidos`](../033-pedidos/spec.md) — alcance integral MIG-33                 |
| Alcance | `POST /api/v1/pedidos/{id}/pago`: cobrar un pedido entregado, registrar el pago y liberar la mesa |

> Piloto del ciclo SDD (MIG-45). Los requisitos salen de
> `docs/api-contract.md` §6.5, `src/pedidos/README.md` §5 y
> `src/pagos/DECISIONS.md` D-02..D-05.

> Esta spec acotada se conserva como piloto histórico de SDD. El usuario
> confirmó que MIG-33 cubre el ciclo integral de pedidos; no se implementa ni
> valida por separado. La fuente vigente es `specs/033-pedidos/spec.md`.

---

## 1. Contexto

Un pedido llega a `entregado` y el salón queda a la espera del cobro. Hoy el
endpoint existe solo en el contrato: el módulo `pedidos` es un scaffold y
`PagosService` rechaza con `501` (MIG-31).

El cobro es el punto donde se cruzan tres datos sensibles: el monto que entra a
la caja, el estado del pedido y la disponibilidad de la mesa. Si una de las tres
escrituras queda a medias, el arqueo de caja y el salón quedan inconsistentes.
Por eso el requisito central no es "crear un pago", sino **cobrar de forma
atómica**.

---

## 2. Fuera de alcance

- Crear pedidos, calcular totales y descontar stock (MIG-33, otra spec).
- Transiciones manuales de estado por `PATCH` (MIG-33, otra spec).
- Apertura, cierre, historial y movimientos de caja (MIG-32).
- Cobros parciales, propinas, descuentos, impuestos y múltiples métodos por
  pedido (el contrato no los define).
- Refundos o anulación de un pago ya registrado.
- Actualización de `total_ventas` de la caja: es un dato derivado
  (`src/caja/DECISIONS.md` D-02).

---

## 3. Historia de usuario

**Como** administrador de la caja, **quiero** cobrar un pedido entregado
indicando el método de pago, **para** cerrar la cuenta, registrar la venta y
dejar la mesa disponible para el próximo cliente.

---

## 4. Requisitos funcionales

- **RF-01** CUANDO el administrador invoca `POST /api/v1/pedidos/{id}/pago` con
  un método de pago válido, un pedido `entregado` y una caja abierta, EL SISTEMA
  DEBE responder `200` con el pedido en estado `pagado`.
- **RF-02** SI el pedido no existe, ENTONCES EL SISTEMA DEBE responder `404` con
  `{ "detail": "Pedido no encontrado" }`.
- **RF-03** SI el pedido no está en estado `entregado`, ENTONCES EL SISTEMA DEBE
  responder `400` con
  `Solo se puede cobrar un pedido en estado 'entregado' (estado actual: '<estado>')`.
- **RF-04** SI no hay una caja abierta, ENTONCES EL SISTEMA DEBE responder `400`
  con `No se puede cobrar un pedido sin una caja abierta`.
- **RF-05** SI `metodo_pago` no pertenece a
  `efectivo | debito | credito | transferencia | mercado_pago`, ENTONCES EL
  SISTEMA DEBE responder `422` con `{ "detail": "..." }`.
- **RF-06** CUANDO el cobro es válido, EL SISTEMA DEBE registrar un pago con
  `monto` igual al `total` del pedido, `caja_id` de la caja abierta y
  `usuario_id` del usuario autenticado.
- **RF-07** CUANDO el cobro es válido, EL SISTEMA DEBE marcar el pedido como
  `pagado` y la mesa asociada como `libre`.
- **RF-08** SI cualquier paso del cobro falla, ENTONCES EL SISTEMA NO DEBE dejar
  pago registrado, ni cambio de estado, ni mesa liberada.
- **RF-09** SI dos solicitudes intentan cobrar el mismo pedido de forma
  concurrente, ENTONCES EL SISTEMA DEBE registrar un solo pago y la segunda DEBE
  recibir `400` (el pedido ya no está `entregado`).
- **RF-10** SI la solicitud no trae un token válido, ENTONCES EL SISTEMA DEBE
  responder `401`; SI el rol no es `admin`, ENTONCES DEBE responder `403`.
- **RF-11** EL SISTEMA DEBE responder con el shape `Pedido` del contrato:
  `id`, `estado`, `total`, `fecha`, `mesa`, `usuario` y `detalles` anidados, sin
  exponer columnas internas.

---

## 5. Requisitos no funcionales

- **RNF-01** El cobro responde `200`, no `201` (contrato D-07).
- **RNF-02** `monto` y `total` salen como `number` con dos decimales, nunca como
  string (ADR 0004).
- **RNF-03** `fecha` sale en ISO-8601 UTC con `Z` (ADR 0003, ADR 0007).
- **RNF-04** Los errores usan `{ "detail": "..." }` y los códigos del contrato
  (ADR 0001, ADR 0002).
- **RNF-05** El cobro se resuelve en **una transacción** de base de datos; no hay
  escrituras fuera de ella.
- **RNF-06** La respuesta no dispara consultas N+1: mesa, usuario y detalles se
  resuelven con `relations` explícitas.
- **RNF-07** El endpoint declara `@Roles('admin')` y `@ApiBearerAuth()`.

---

## 6. Casos límite y errores

| Caso                                          | Resultado esperado                               |
| --------------------------------------------- | ------------------------------------------------ |
| Pedido inexistente                            | `404` `Pedido no encontrado`                     |
| Pedido `pendiente`, `en_preparacion`, `listo` | `400` estado inválido                            |
| Pedido `pagado` o `cancelado`                 | `400` estado inválido (estados finales)          |
| Sin caja abierta                              | `400` sin caja abierta                           |
| `metodo_pago` ausente o inválido              | `422`                                            |
| Cuerpo vacío o campo extra                    | `422` (whitelist del `ValidationPipe`)           |
| Doble clic / dos requests concurrentes        | Un pago; el segundo `400` por estado             |
| Fallo al liberar la mesa                      | Rollback total: no queda pago ni pedido `pagado` |
| Pedido con `total = 0`                        | Ver supuesto S-04 (no hay regla en el contrato)  |
| Token de `mozo`                               | `403`                                            |

---

## 7. Criterios de aceptación

| #     | Observable                                                                                          |
| ----- | --------------------------------------------------------------------------------------------------- |
| CA-01 | `POST /pedidos/{id}/pago` sobre un pedido `entregado` devuelve `200` y `estado: "pagado"`.          |
| CA-02 | La fila de `pagos` tiene `monto = total`, `caja_id` de la caja abierta y `metodo_pago` del request. |
| CA-03 | La mesa del pedido queda en `libre` en la misma operación.                                          |
| CA-04 | Un fallo simulado en cualquier paso deja las tres tablas sin cambios.                               |
| CA-05 | Los cinco métodos del enum se aceptan; un valor libre devuelve `422`.                               |
| CA-06 | `401` sin token y `403` con rol `mozo`.                                                             |
| CA-07 | El body de éxito respeta el shape `Pedido` y no expone `password_hash`.                             |

---

## 8. Supuestos y preguntas abiertas

| #    | Supuesto / pregunta                                                                                                                 | Estado                     |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| S-01 | La caja abierta se resuelve por `estado = 'abierta'` y hay como máximo una (caja D-03).                                             | Aceptado                   |
| S-02 | `usuario_id` del pago es el usuario del token; la columna es nullable por datos históricos (pagos D-08).                            | Aceptado                   |
| S-03 | No se actualiza `total_ventas`: se deriva de los pagos (caja D-02).                                                                 | Aceptado                   |
| S-04 | Se acepta cobrar un pedido con `total = 0`: el contrato no lo prohíbe. Si el negocio lo rechaza, se agrega un RF en una spec nueva. | **Confirmar con producto** |
| S-05 | La mesa del pedido existe y está en `pendiente_cobro`; el cobro la pasa a `libre` sin validar su estado previo.                     | Aceptado                   |

---

## 9. Referencias

- `docs/api-contract.md` §6.5 (`POST /pedidos/{id}/pago`)
- `docs/conventions.md` §6.3, §7
- `src/pedidos/CONTRACT.md` y `DECISIONS.md` D-01..D-08
- `src/pagos/DECISIONS.md` D-02..D-11
- `src/caja/DECISIONS.md` D-02, D-03, D-05
- ADR 0001, 0002, 0003, 0004, 0007
- MIG-30 (entities), MIG-32 (caja), MIG-44 (esquema)
