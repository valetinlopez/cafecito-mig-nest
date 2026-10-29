# Spec 032 — Gestión de caja

| Campo   | Valor                                                                          |
| ------- | ------------------------------------------------------------------------------ |
| Ticket  | MIG-32                                                                         |
| Epic    | MIG-7 — E7: Módulo Pagos & Caja                                                |
| Estado  | Aprobada para implementación                                                   |
| Alcance | Gestionar apertura, cierre, consulta, historial, movimientos y ventas de caja. |

## 1. Contexto

La operación necesita registrar los turnos de caja y consultar los cobros que
pertenecen a cada período, manteniendo el contrato que consume
`cajaStore.ts`. Solo puede existir una caja abierta a la vez.

## 2. Fuera de alcance

- Cambios al contrato global de API o al frontend.
- Cambios de esquema de producción, migraciones o DDL.
- Crear una tabla separada de movimientos; los movimientos se derivan de pagos.
- Implementar el flujo de cobro de pedidos (MIG-33).
- Reportes de caja distintos de `total_ventas`.

## 3. Historia de usuario

**Como** administrador, **quiero** abrir y cerrar cajas y consultar sus
movimientos, **para** controlar los fondos y las ventas de cada período.

## 4. Requisitos funcionales

- **RF-01** CUANDO un administrador abre una caja y no hay otra abierta, EL
  SISTEMA DEBE crearla con el monto inicial recibido, fecha de apertura actual,
  estado `abierta` y responder `201` con su representación.
- **RF-02** SI ya existe una caja abierta al solicitar una apertura, ENTONCES EL
  SISTEMA DEBE responder `400` con `Ya hay una caja abierta` y no crear otra.
- **RF-03** CUANDO un administrador consulta la caja abierta, EL SISTEMA DEBE
  devolver `200` con la caja y sus ventas del período; si no existe, DEBE
  devolver `200` con el literal JSON `null`.
- **RF-04** CUANDO un administrador consulta el historial, EL SISTEMA DEBE
  devolver todas las cajas ordenadas por fecha de apertura descendente, cada una
  con su `total_ventas` calculado.
- **RF-05** CUANDO un administrador consulta los movimientos de una caja
  existente, EL SISTEMA DEBE devolver los pagos del período ordenados por fecha
  descendente, con `pedido_id`, `mesa_numero`, `monto`, `metodo_pago` y
  `usuario_nombre` nullable.
- **RF-06** SI se consultan movimientos de una caja inexistente, ENTONCES EL
  SISTEMA DEBE responder `404` con `Caja no encontrada`.
- **RF-07** CUANDO un administrador cierra la caja abierta con un monto final,
  EL SISTEMA DEBE guardar el monto, registrar la fecha de cierre actual, cambiar
  el estado a `cerrada` y responder `200` con su representación actualizada.
- **RF-08** SI se solicita cerrar una caja y no hay una abierta, ENTONCES EL
  SISTEMA DEBE responder `400` con `No hay una caja abierta`.
- **RF-09** SI dos aperturas concurrentes se ejecutan sin una caja abierta al
  inicio, ENTONCES EL SISTEMA DEBE serializarlas y permitir como máximo una
  nueva caja abierta, sin modificar el esquema de base de datos.
- **RF-10** MIENTRAS una caja se está cerrando, EL SISTEMA DEBE bloquear la fila
  de la caja abierta para evitar cierres concurrentes inconsistentes.
- **RF-11** SI un request de apertura o cierre no contiene un monto numérico
  válido, ENTONCES EL SISTEMA DEBE responder `422` con el envelope `{ "detail":
"..." }`.
- **RF-12** SI una petición no contiene autenticación válida, ENTONCES EL
  SISTEMA DEBE responder `401`.
- **RF-13** SI el usuario autenticado no tiene rol `admin`, ENTONCES EL
  SISTEMA DEBE responder `403`.

## 5. Requisitos no funcionales

- **RNF-01** La entity representa la tabla independiente `cajas` con los campos
  indicados por MIG-32; `total_ventas` es derivado en runtime, no una columna.
- **RNF-02** Los responses conservan los nombres, tipos y códigos definidos en
  `docs/api-contract.md` §6.6; montos JSON son `number` y fechas ISO-8601 UTC
  terminadas en `Z`.
- **RNF-03** Todos los endpoints de caja requieren rol `admin`.
- **RNF-04** Las colecciones aceptan con y sin barra final sin redirect.
- **RNF-05** `total_ventas` es la suma de pagos asociados a la caja y devuelve
  cero cuando no existen pagos.
- **RNF-06** Las consultas de movimientos resuelven pedido, mesa y usuario sin
  consultas N+1.

## 6. Casos límite y errores

| Caso                                        | Resultado                            |
| ------------------------------------------- | ------------------------------------ |
| Caja abierta inexistente en consulta actual | `200` con JSON `null` literal        |
| Apertura duplicada                          | `400`, `Ya hay una caja abierta`     |
| Cierre sin caja abierta                     | `400`, `No hay una caja abierta`     |
| Movimientos para caja desconocida           | `404`, `Caja no encontrada`          |
| Caja sin pagos en el período                | `total_ventas: 0`                    |
| Pago sin usuario asociado                   | `usuario_nombre: null`               |
| Monto omitido o no numérico                 | `422` con `{ "detail": "..." }`      |
| Sin token                                   | `401`                                |
| Rol distinto de admin                       | `403`                                |
| Aperturas concurrentes                      | Como máximo una apertura tiene éxito |

## 7. Criterios de aceptación

- **CA-01** Apertura y cierre persisten los importes, estado y fechas correctos,
  incluyendo los errores contractuales indicados.
- **CA-02** Consulta actual, historial y `total_ventas` cumplen sus shapes y
  orden esperado; ausencia de caja abierta se serializa como JSON `null`.
- **CA-03** Los movimientos incluyen pedido, mesa y usuario nullable y están
  ordenados por fecha descendente; una caja inexistente responde `404`.
- **CA-04** El cierre usa lock pesimista dentro de una transacción.
- **CA-05** Las aperturas concurrentes quedan serializadas sin DDL y nunca dejan
  dos cajas abiertas.
- **CA-06** Los cinco endpoints exigen admin y conservan compatibilidad con
  `cajaStore.ts`, incluidos status, campos y rutas.

## 8. Supuestos y preguntas abiertas

- **S-01 — Resuelto por alcance confirmado:** la Entity es independiente, sin
  relaciones ORM; los movimientos se derivan de pagos.
- **S-02 — Resuelto por alcance confirmado:** se usa un lock transaccional de
  PostgreSQL para serializar aperturas; no se agrega DDL.
- **S-03 — Resuelto por el contrato local:** los pagos del período se obtienen
  por `caja_id`; la fecha define el orden descendente y no se infiere un rango
  adicional.
- **S-04 — Resuelto por el modelo documentado:** montos `numeric(10,2)` y fechas
  timestamp legacy con transformers compartidos. No se ejecuta DDL; MIG-44
  conserva la validación del esquema real.
- **S-05 — Resuelto por el ticket:** los DTOs requieren `@IsNumber`; no se
  agregan límites de monto que el ticket no especifica.

## 9. Referencias

- MIG-32 — “Módulo Caja completo: Entity, DTOs, Service, Controller”.
- `docs/api-contract.md` §6.6 y `docs/openapi.yaml`.
- `src/caja/README.md`, `CONTRACT.md` y `DECISIONS.md`.
- `docs/constitution.md` §1, §3, §4, §5, §8 y §9.
- ADR 0001, 0003, 0004, 0005 y 0007.
