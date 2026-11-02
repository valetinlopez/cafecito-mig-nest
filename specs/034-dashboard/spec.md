# Spec 034 — Resumen de KPIs del dashboard

| Campo   | Valor                                                     |
| ------- | --------------------------------------------------------- |
| Ticket  | MIG-34                                                    |
| Epic    | No indicada en la descripción consultada                  |
| Estado  | Aprobada para implementación                              |
| Alcance | Exponer el resumen operativo de ventas, mesas, pedidos y caja para el admin. |

## 1. Contexto

La pantalla principal del administrador necesita un resumen actualizado de la operación. El endpoint reúne ventas del día, estados de mesas y pedidos, caja abierta y pedidos recientes, manteniendo el contrato que consume el frontend.

## 2. Fuera de alcance

- Crear o modificar datos, entidades o el esquema compartido.
- Cambiar el contrato consumido por el frontend o el endpoint existente.
- Implementar reportes, filtros por período, paginación o caching.
- Mostrar más información de caja que su estado, monto inicial y fecha de apertura.

## 3. Historia de usuario

**Como** administrador, **quiero** consultar en una respuesta los principales indicadores operativos del día, **para** conocer rápidamente ventas, ocupación, pedidos y caja.

## 4. Requisitos funcionales

- **RF-01** CUANDO un administrador autenticado consulta el resumen, EL SISTEMA DEBE responder `200` con los bloques `ventas_dia`, `mesas`, `pedidos_activos`, `caja` y `ultimos_pedidos` según el contrato vigente.
- **RF-02** CUANDO se calcula `ventas_dia`, EL SISTEMA DEBE sumar los montos y contar los pagos cuya fecha pertenece al día de negocio en curso, desde las 00:00 inclusive hasta las 24:00 exclusive.
- **RF-03** CUANDO se calcula `mesas`, EL SISTEMA DEBE devolver el total de mesas y los conteos de estados `libre`, `ocupada` y `pendiente_cobro` en los campos contractuales `libres`, `ocupadas` y `pendientes_cobro`.
- **RF-04** CUANDO se calcula `pedidos_activos`, EL SISTEMA DEBE devolver el total y los conteos para `pendiente`, `en_preparacion`, `listo` y `entregado`, mapeados a los campos contractuales `pendientes`, `en_preparacion`, `listos` y `entregados`.
- **RF-05** CUANDO existe una caja abierta, EL SISTEMA DEBE incluir su estado, monto inicial y fecha de apertura; SI no existe, ENTONCES DEBE devolver `estado: "cerrada"` y `null` explícito para monto y fecha.
- **RF-06** SI existen varias cajas abiertas, ENTONCES EL SISTEMA DEBE devolver el resumen sin fallar por cardinalidad y seleccionar la caja abierta de apertura más reciente (desempate por id descendente).
- **RF-07** CUANDO se calcula `ultimos_pedidos`, EL SISTEMA DEBE devolver como máximo los 50 pedidos más recientes, ordenados por fecha descendente y, en empate, por id descendente; cada resultado incluye mesa, suma de cantidades de sus detalles, total y estado.
- **RF-08** SI no existen pagos, mesas, pedidos o pedidos recientes, ENTONCES EL SISTEMA DEBE devolver ceros para los conteos y totales, y una lista vacía para `ultimos_pedidos`.
- **RF-09** SI un usuario autenticado no tiene rol `admin`, ENTONCES EL SISTEMA DEBE responder `403`; SI no presenta autenticación válida, DEBE responder `401`.

## 5. Requisitos no funcionales

- **RNF-01** La respuesta conserva el JSON `snake_case` y el shape publicado: `DashboardResumen`, incluyendo `mesa` e `items` en cada pedido reciente. El número de mesa y la suma de cantidades de detalles se exponen en esos campos contractuales.
- **RNF-02** Los totales monetarios se serializan como JSON `number`; `fecha_apertura` se serializa como ISO-8601 UTC con `Z` o `null`.
- **RNF-03** Los cálculos y límites se resuelven en la base de datos; no se cargan colecciones completas para agregarlas en memoria.
- **RNF-04** Las respuestas no serializan entities directamente y conservan el envelope de error global `{ "detail": "..." }`.

## 6. Casos límite y errores

| Caso | Resultado |
| ---- | --------- |
| Sin pagos del día | `ventas_dia.total = 0`, `ventas_dia.pagos = 0` |
| Sin mesas o pedidos | Conteos en `0` |
| Sin pedidos recientes | `ultimos_pedidos = []` |
| Sin caja abierta | Caja cerrada con monto inicial y fecha `null` |
| Más de una caja abierta | Se representa la más reciente, sin error de cardinalidad |
| Usuario mozo | `403` con `{ "detail": "..." }` |
| Sin token válido | `401` con `{ "detail": "..." }` |
| Más de 50 pedidos | Solo se devuelven los 50 más recientes |

## 7. Criterios de aceptación

- **CA-01** Los cinco bloques del resumen reflejan los datos disponibles y responden con el shape contractual.
- **CA-02** Las ventas consideran únicamente los pagos del día de negocio actual, con inicio inclusivo y fin exclusivo.
- **CA-03** Las agregaciones se ejecutan en consultas de base eficientes, sin materializar tablas completas en memoria.
- **CA-04** La presencia de varias cajas abiertas no rompe el endpoint y se escoge la de apertura más reciente.
- **CA-05** Los montos son números JSON y la fecha conserva el formato UTC con `Z`.
- **CA-06** Solo un administrador autenticado puede consultar el endpoint.
- **CA-07** `ultimos_pedidos` respeta límite de 50, orden descendente y mapea mesa/items al contrato del frontend.

## 8. Supuestos y preguntas abiertas

- El día de negocio usa `America/Argentina/Buenos_Aires`, según la decisión local D-03 de `src/dashboard/DECISIONS.md`; sus límites se convierten a UTC para consultar pagos.
- El contrato formal prevalece para los nombres expuestos: el número de mesa y la suma de cantidades descritos como `numero_mesa` y `cantidad_items` en el ticket se serializan como `mesa` e `items`, respectivamente.
- El límite de 50 indicado por MIG-34 reemplaza el límite 5 que aparece en la decisión local antigua D-04.
- Los pedidos recientes incluyen todos los estados; `items` representa la suma de cantidades, según las aclaraciones del usuario.
- No quedan preguntas abiertas que bloqueen la implementación.

## 9. Referencias

- MIG-34 — “Módulo Dashboard: KPIs agregados”.
- `docs/api-contract.md` §4, §6.7 y schema `DashboardResumen`.
- `docs/openapi.yaml` — operación `GET /api/v1/dashboard/resumen` y esquemas `Dashboard*`.
- `src/dashboard/README.md`, `CONTRACT.md` y `DECISIONS.md`.
- ADR 0003 y ADR 0007 — serialización de fechas UTC.