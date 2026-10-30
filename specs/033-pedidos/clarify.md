# Clarify — 033-pedidos

> Fase 2: registra ambigüedades detectadas y su resolución acordada; no agrega
> requisitos fuera del alcance MIG-33.

| #    | Tema                    | Hallazgo                                                                                                                          | Resolución                                                                                                                                                                                         |
| ---- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F-01 | Alcance del ticket      | La spec previa `033-cobro` solo cubría cobro, pero la descripción MIG-33 incluye las cinco rutas y la lógica completa de pedidos. | El usuario confirmó alcance integral: GET colección/detalle, POST creación, PATCH estado y POST pago. Esta spec reemplaza el recorte anterior antes de implementación.                             |
| F-02 | Estado de mesa al crear | El contrato enumera errores por mesa y pedido activo, pero no define si se valida estado de mesa.                                 | Se toma `pedido activo` como condición de ocupación; el lock pesimista de mesa serializa dos creaciones concurrentes. Mesa inexistente produce el mensaje contractual `Mesa N no encontrada`.      |
| F-03 | Renglones repetidos     | Un carrito puede repetir producto; validar cada línea aisladamente podría sobre-vender.                                           | Confirmado por el usuario: conservar cada detalle y subtotal, agregar cantidades por producto para validar y descontar stock agregado. Bloquear productos por id ascendente dentro de transacción. |
| F-04 | Cancelación y stock     | La descripción resumida no mencionaba reposición; la decisión local D-06 existente sí.                                            | Confirmado por el usuario: reponer stock al cancelar dentro de la misma transacción; solo puede ocurrir desde estados no terminales, por lo que no se repone dos veces.                            |
| F-05 | GET colección           | El contrato define pedidos activos sin pagados/cancelados, sin orden explícito en la descripción del ticket.                      | Aplicar regla documentada: estados activos `pendiente`, `en_preparacion`, `listo`, `entregado`; orden fecha descendente según README/DECISIONS del módulo.                                         |
| F-06 | Autorización            | El ticket dice `user` para GET/POST/PATCH y `admin` para pago.                                                                    | Confirmado: JWT requerido en todas las rutas; solo pago exige rol `admin`.                                                                                                                         |
| F-07 | Total cero              | La spec de cobro previa deja abierta la aceptación del pedido con total cero.                                                     | Confirmado por el usuario: permitir el cobro con total cero.                                                                                                                                       |
| F-08 | Locks de inventario     | Lock de mesa no impide que dos mesas consuman simultáneamente el mismo stock.                                                     | Confirmado: además del lock de mesa, bloquear producto(s) durante la transacción; orden ascendente de ids previene ciclos de espera al compartir varios productos.                                 |
| F-09 | Lock y cierre de caja   | Un cobro no debe competir con el cierre de caja.                                                                                  | El cobro usa `CajaService.findAbierta(manager)` dentro de la transacción, que aplica `pessimistic_write` a la caja abierta.                                                                        |
| F-10 | Fuente del legacy       | La descripción refiere `pedido_service.py`, pero ese archivo no está en este workspace.                                           | Para este alcance se usan la descripción del usuario, el contrato global y decisiones/documentación existentes; cualquier diferencia no descrita no se inventa.                                    |

## Estado

- Ambigüedades de alcance confirmadas por el usuario: 0 pendientes.
- Mensajes de creación/transición se toman del contrato global §6.5.
- Nombres/columnas físicas siguen provisionales hasta MIG-44; no se ejecuta DDL.

## Veredicto de la fase 2

`SPEC LISTA` — la spec integral fue aprobada por el usuario el 2026-10-29.
