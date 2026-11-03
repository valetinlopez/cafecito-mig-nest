# Spec 037 — Reporte de ventas por rango de fechas

| Campo   | Valor                                                                 |
| ------- | --------------------------------------------------------------------- |
| Ticket  | MIG-37                                                                |
| Epic    | MIG-6 — E8: Dashboard & Reportes                                      |
| Estado  | Aprobada para implementación                                          |
| Alcance | Exponer el reporte de ventas de un período con sus cinco secciones.    |

## 1. Contexto

El administrador necesita cerrar el día y analizar la operación por período. El
backend legacy resuelve esto con cinco sub-consultas sobre pagos, pedidos,
detalles y cajas. La migración debe conservar el shape que consume
`reportesStore.ts` y mover las agregaciones a SQL para no cargar filas en
memoria.

## 2. Fuera de alcance

- Crear o modificar datos, entidades o el esquema compartido.
- Cambiar el contrato, los nombres de campos o los códigos de estado.
- Exportar a CSV/PDF, paginar o cachear el reporte (D-06).
- Reportes distintos de ventas (stock, empleados, propinas).
- Definir la zona horaria del negocio por ADR: se reutiliza la de `dashboard`.

## 3. Historia de usuario

**Como** administrador, **quiero** consultar las ventas de un rango de fechas con
su resumen, métodos de pago, productos, mesas y cajas, **para** analizar y
cerrar la operación del período.

## 4. Requisitos funcionales

- **RF-01** CUANDO un administrador autenticado consulta el reporte con `desde` y
  `hasta` válidos, EL SISTEMA DEBE responder `200` con `periodo`, `resumen`,
  `ventas_por_metodo`, `productos_mas_vendidos`, `mesas_utilizadas` y `cajas`.
- **RF-02** CUANDO se calcula el resumen, EL SISTEMA DEBE sumar los montos de los
  cobros del período y contar los cobros y los pedidos distintos cobrados.
- **RF-03** CUANDO se calcula `ticket_promedio`, EL SISTEMA DEBE dividir
  `total_vendido` por `cantidad_cobros` y devolver `0` si no hay cobros.
- **RF-04** CUANDO se agrupan las ventas por método, EL SISTEMA DEBE devolver por
  método la cantidad de cobros y su total, ordenado por total descendente.
- **RF-05** CUANDO se calculan los productos más vendidos, EL SISTEMA DEBE sumar
  cantidades y subtotales de los pedidos cobrados en el período, ordenar por
  cantidad descendente y devolver como máximo 20 productos.
- **RF-06** CUANDO se calculan las mesas utilizadas, EL SISTEMA DEBE agrupar los
  pedidos cobrados por mesa con su cantidad de pedidos y total, ordenado por
  cantidad descendente.
- **RF-07** CUANDO se listan las cajas, EL SISTEMA DEBE incluir solo las que
  intersectan el período y calcular `ventas_efectivo` con todos los cobros en
  efectivo de la caja.
- **RF-08** CUANDO una caja está cerrada con `monto_final`, EL SISTEMA DEBE
  calcular `diferencia = monto_final - (monto_inicial + ventas_efectivo)`; SI la
  caja sigue abierta, ENTONCES DEBE devolver `null`.
- **RF-09** SI `desde` es posterior a `hasta`, ENTONCES EL SISTEMA DEBE responder
  `400` con `La fecha 'desde' no puede ser posterior a 'hasta'`.
- **RF-10** SI falta un parámetro o no cumple `YYYY-MM-DD`, ENTONCES EL SISTEMA
  DEBE responder `422` con `{ "detail": "..." }`.
- **RF-11** SI el usuario no tiene rol `admin`, ENTONCES EL SISTEMA DEBE responder
  `403`; SI no presenta autenticación válida, DEBE responder `401`.
- **RF-12** SI no hay cobros en el período, ENTONCES EL SISTEMA DEBE devolver
  ceros en el resumen y listas vacías en las cuatro colecciones.

## 5. Requisitos no funcionales

- **RNF-01** La respuesta conserva el JSON `snake_case` y el shape
  `ReporteVentasResponse` del contrato vigente.
- **RNF-02** Los montos se serializan como JSON `number` con dos decimales;
  `fecha_apertura`/`fecha_cierre` como ISO-8601 UTC con `Z` o `null`.
- **RNF-03** Cada bloque se agrega en SQL y los cinco se ejecutan en paralelo; no
  se cargan colecciones para agregarlas en memoria.
- **RNF-04** No se serializan entities y los errores usan el envelope global
  `{ "detail": "..." }`.
- **RNF-05** El período se interpreta como fechas inclusivas del negocio en
  `America/Argentina/Buenos_Aires` y se consulta en UTC con límite superior
  exclusivo (inicio del día siguiente).

## 6. Casos límite y errores

| Caso                                          | Resultado                                          |
| --------------------------------------------- | -------------------------------------------------- |
| Período sin cobros                            | Ceros en `resumen` y `[]` en las colecciones       |
| Un solo día                                   | `periodo.desde == periodo.hasta`                   |
| Cobro del último día a las 23:59 local        | Incluido en el reporte                             |
| Cobro del día siguiente a las 00:00 local     | Excluido del reporte                               |
| Caja cerrada antes del inicio del período     | Excluida de `cajas`                                |
| Caja abierta dentro del período               | Incluida con `fecha_cierre`, `monto_final` y `diferencia` en `null` |
| Diferencia de caja negativa                   | Se devuelve negativa, sin normalizar               |
| Más de 20 productos                           | Solo los 20 de mayor cantidad                      |
| `desde > hasta`                               | `400` con el `detail` contractual                  |
| Fecha con formato inválido o faltante         | `422`                                              |
| Usuario `mozo`                                | `403` con `{ "detail": "..." }`                    |
| Sin token                                     | `401` con `{ "detail": "..." }`                    |

## 7. Criterios de aceptación

- **CA-01** Las cinco secciones se calculan correctamente y responden con el shape
  contractual.
- **CA-02** La diferencia de caja es correcta y las cajas fuera del rango se
  excluyen.
- **CA-03** El endpoint es compatible con `reportesStore.ts`: mismos nombres,
  mismos tipos y `null` explícito donde el contrato lo permite.
- **CA-04** Las agregaciones y los límites se resuelven en la base.
- **CA-05** Solo un administrador autenticado puede consultar el reporte.
- **CA-06** `lint`, `typecheck`, unitarios y e2e están en verde.

## 8. Supuestos y preguntas abiertas

- El eje del período es `pagos.fecha`, no `pedidos.estado = 'pagado'`: un pedido
  cuenta como vendido si tiene un cobro dentro del rango (D-08).
- `ticket_promedio` se divide por `cantidad_cobros`, porque así lo indican el
  ticket y el ejemplo del contrato (`125000 / 84 = 1488.1`); se corrige la
  mención a `pedidos_cobrados` del README previo (D-04).
- La zona horaria del negocio es la misma que fijó `dashboard` (D-03), sin ADR
  nuevo porque el contrato no la especifica.
- No quedan preguntas que bloqueen la implementación.

## 9. Referencias

- MIG-37 — “Módulo Reportes: ventas por rango de fechas”.
- `docs/api-contract.md` §6.9 y schema `ReporteVentasResponse`.
- `docs/openapi.yaml` — `GET /api/v1/reportes/ventas`.
- `src/reportes/README.md`, `CONTRACT.md` y `DECISIONS.md`.
- ADR 0003, ADR 0004 y ADR 0007 — UTC y decimales.
