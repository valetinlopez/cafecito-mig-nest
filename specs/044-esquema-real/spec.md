# Spec 044 — Validar el backend contra el esquema real de producción

| Campo   | Valor                                                                              |
| ------- | ---------------------------------------------------------------------------------- |
| Ticket  | MIG-44                                                                             |
| Epic    | MIG-9 — E9: Testing & QA                                                           |
| Estado  | Implementada; revisión humana pendiente                                            |
| Alcance | Adaptar el backend a la base real, sin modificarla, y probarlo sobre una copia.    |

## 1. Contexto

La base de producción es compartida con el backend legacy. Las entities de NestJS
se escribieron a partir del contrato y del modelo legacy, a la espera de esta
validación.

Al compararlas con una copia de producción aparecieron 39 diferencias. Dos
impedirían operar:

- Los pagos reales no guardan a qué caja pertenecen ni quién los registró, y el
  backend nuevo lee y escribe ese dato. Fallarían el cobro, los totales y
  movimientos de caja y el reporte de ventas.
- La base no completa valores por defecto: los pone la aplicación legacy. El
  backend nuevo cuenta con que los ponga la base, así que las fechas de cajas,
  pedidos y pagos quedarían vacías, y un empleado nuevo no podría iniciar sesión.

Las demás diferencias son de forma, pero el ticket exige que la comparación no
proponga ningún cambio. La prueba automática de MIG-38 simula la base y no podía
detectar nada de esto.

Decisión de arquitectura: [ADR 0009](../../docs/adr/0009-entities-siguen-esquema-legacy.md).

## 2. Fuera de alcance

- Cualquier cambio de esquema sobre la base compartida.
- Registrar quién cobró un pago o guardar la caja de cada pago.
- Cambiar el contrato, la constitución o un ADR aceptado.
- El seed de datos (MIG-39) y el cutover (MIG-42).
- Validar el largo de los textos en los DTOs.
- Aplicar el `numericTransformer` a `productos` y la relación inversa de
  `categorias`: no afectan la comparación de esquema ni los criterios del ticket.

## 3. Historia de usuario

**Como** equipo de migración, **quiero** que el backend nuevo funcione sobre la
base real sin modificarla, **para** hacer el cutover con los datos de producción y
con los mismos números que hoy muestra el legacy.

## 4. Requisitos funcionales

### A. Pagos y caja

- **RF-01** CUANDO se consultan los movimientos de una caja, EL SISTEMA DEBE
  devolver los pagos cuya fecha cae entre la apertura y el cierre de esa caja, con
  ambos límites incluidos.
- **RF-02** MIENTRAS una caja sigue abierta, EL SISTEMA DEBE considerar como fin de
  su período el momento de la consulta.
- **RF-03** CUANDO EL SISTEMA informa el `total_ventas` de una caja, en la caja
  actual, el historial, la apertura o el cierre, DEBE sumar los pagos de su período.
- **RF-04** CUANDO EL SISTEMA informa `ventas_efectivo` en el reporte, DEBE sumar
  los pagos en efectivo de todo el período de la caja, sin limitarlo al rango
  consultado.
- **RF-05** CUANDO EL SISTEMA informa `usuario_nombre` en un movimiento, DEBE usar
  el nombre del usuario que registró el pedido.
- **RF-06** CUANDO un administrador cobra un pedido entregado con una caja abierta,
  EL SISTEMA DEBE registrar un pago con el pedido, el método, el total y la fecha
  del cobro.
- **RF-07** SI llegan dos cobros simultáneos del mismo pedido, ENTONCES EL SISTEMA
  DEBE registrar un solo pago y responder `400` al segundo.

### B. Valores que la base no asigna

- **RF-08** CUANDO se abre una caja, EL SISTEMA DEBE guardar la fecha de apertura.
- **RF-09** CUANDO se crea un pedido, EL SISTEMA DEBE guardar su fecha.
- **RF-10** CUANDO se registra un pago, EL SISTEMA DEBE guardar su fecha.
- **RF-11** CUANDO se crea un usuario, por registro o como empleado, EL SISTEMA DEBE
  guardarlo activo.

### C. Coincidencia con el esquema

- **RF-12** CUANDO se compara el mapeo del backend con la copia de producción, la
  comparación NO DEBE proponer ningún cambio.
- **RF-13** EL SISTEMA NO DEBE modificar el esquema de la base en ningún paso de
  esta validación.

### D. Validación sobre la copia de producción

- **RF-14** CUANDO un usuario real activo inicia sesión con su contraseña actual, EL
  SISTEMA DEBE autenticarlo.
- **RF-15** SI un usuario real está inactivo, ENTONCES EL SISTEMA DEBE rechazar su
  inicio de sesión.
- **RF-16** CUANDO se recorre el flujo completo (login, mesas, pedido, estados, caja,
  cobro, movimientos, cierre, dashboard y reportes) sobre la copia, cada paso DEBE
  responder con el status del contrato y dejar los datos correctos.
- **RF-17** CUANDO se consultan las cajas históricas, EL SISTEMA DEBE informar los
  mismos totales que resultan de aplicar la regla del legacy a los mismos datos.
- **RF-18** EL SISTEMA DEBE contar con una guía de prueba manual que funcione sobre
  datos reales, sin suponer el seed ni identificadores fijos.

## 5. Requisitos no funcionales

- **RNF-01** Ningún endpoint cambia de path, status, campos ni mensajes.
- **RNF-02** Los totales y movimientos se resuelven en la base, no en memoria.
- **RNF-03** No se agregan dependencias ni dependencias circulares entre módulos.
- **RNF-04** La prueba de compatibilidad deja de simular valores que la base real no
  asigna, para detectar si la aplicación deja de completarlos.
- **RNF-05** La conexión y las contraseñas reales no se escriben en el repo ni en la
  documentación.

## 6. Casos límite y errores

| Caso                                                    | Resultado                                              |
| ------------------------------------------------------- | ------------------------------------------------------ |
| Pago con la fecha exacta de apertura o cierre           | Pertenece a la caja                                    |
| Pago en el instante exacto de cierre de una y apertura de otra | Cuenta en ambas, como en el legacy              |
| Caja sin pagos en su período                            | `total_ventas: 0`, `ventas_efectivo: 0`, movimientos `[]` |
| Cobro simultáneo con el cierre de la caja               | El pago queda dentro del período o el cobro responde `400` |
| Pago creado por el legacy durante la convivencia        | Se ve en la caja de su período                         |
| Cobro sin caja abierta                                  | `400`, sin cambios                                     |
| Pedido ya cobrado                                       | `400`, sin un segundo pago                             |
| Dos altas simultáneas con el mismo email                | La segunda responde el error actual de email duplicado |

## 7. Criterios de aceptación

- **CA-01** La comparación de esquema no propone cambios (RF-12).
- **CA-02** El login con usuarios reales funciona con sus hashes actuales (RF-14, RF-15).
- **CA-03** El flujo completo pasa sobre la copia de producción (RF-16).
- **CA-04** La copia de producción se borra al terminar.
- **CA-05** Los totales históricos coinciden con la regla del legacy (RF-01..RF-05, RF-17).
- **CA-06** Las reglas de RF-06..RF-11 tienen tests automáticos.
- **CA-07** `lint`, `typecheck`, unitarios y e2e en verde.

## 8. Supuestos y preguntas abiertas

- Decisión del humano: se adapta el backend a la base, sin migración (opción A).
- La copia de producción no tiene valores nulos en las columnas afectadas ni pedidos
  con más de un pago (verificado el 2026-11-03).
- La copia se autoborra un día después de creada. Si vence, se crea otra igual: el
  código no depende de ella.
- No quedan preguntas que bloqueen la implementación.

## 9. Referencias

- MIG-44 — "Validar las entities contra el esquema real de producción (branch de Neon)".
- ADR 0003, 0004, 0007 y 0009; Constitución, artículos 2 y 4.
- `docs/api-contract.md` §6 (caja y cobro), glosario "Movimiento".
- Legacy `backend/app/services/caja_service.py` y `backend/app/models/*.py`
  (`grupo1`, commit `3dfdb1f`).
- `specs/038-smoke-e2e/validate.md`, "Lo que NO quedó verificado".
