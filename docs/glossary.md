# Glosario y modelo de dominio

Vocabulario único del proyecto. Si un término aparece en código, contrato o
documentación, debe significar exactamente lo que dice acá.

---

## 1. Roles

| Rol     | Descripción              | Alcance                                                                                                                                     |
| ------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `admin` | Administrador            | Todos los endpoints, caja, reportes, cobros, empleados y ABM de productos.                                                                  |
| `mozo`  | Mozo / atención en salón | Auth propio, lectura de mesas/productos/categorías, CRUD de pedidos y avance de estados. **No** cobra, no abre/cierra caja, no ve reportes. |

Auth por endpoint: `público` (sin token) · `auth` (cualquier rol) · `admin`
(token con `rol = admin`). Fuente: contrato §4.

---

## 2. Enums del dominio

| Enum           | Valores                                                                    | Dónde se usa        |
| -------------- | -------------------------------------------------------------------------- | ------------------- |
| `Rol`          | `admin`, `mozo`                                                            | `usuarios.rol`      |
| `MesaEstado`   | `libre`, `ocupada`, `reservada`, `pendiente_cobro`, `en_limpieza`          | `mesas.estado`      |
| `PedidoEstado` | `pendiente`, `en_preparacion`, `listo`, `entregado`, `pagado`, `cancelado` | `pedidos.estado`    |
| `CajaEstado`   | `abierta`, `cerrada`                                                       | `cajas.estado`      |
| `MetodoPago`   | `efectivo`, `debito`, `credito`, `transferencia`, `mercado_pago`           | `pagos.metodo_pago` |

Los valores viajan al frontend **tal cual**, en `snake_case`. No se traducen ni
se capitalizan.

---

## 3. Transiciones de estado

### 3.1 Pedido

Manuales (`PATCH /api/v1/pedidos/{id}`):

```
pendiente      → en_preparacion | cancelado
en_preparacion → listo | cancelado
listo          → entregado | cancelado
entregado      → cancelado
pagado         → (final)
cancelado      → (final)
```

No manuales:

```
entregado  --POST /pedidos/{id}/pago-->  pagado
```

### 3.2 Mesa

Manuales (`PATCH /api/v1/mesas/{id}`):

```
libre           → ocupada | reservada
reservada       → ocupada | libre
ocupada         → en_limpieza
pendiente_cobro → ocupada
en_limpieza     → libre
```

Efectos automáticos:

```
pedido creado                     → mesa.estado = ocupada
pedido entregado                  → mesa.estado = pendiente_cobro
pedido cancelado                  → mesa.estado = libre
pedido cobrado (POST /pago)       → mesa.estado = libre
```

Cualquier otra transición responde `400` con `No se puede cambiar el estado de
'<actual>' a '<nuevo>'`.

---

## 4. Términos de negocio

| Término                | Significado                                                                                                                        |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Caja**               | Turno de caja: apertura con monto inicial, cobros del período y cierre con monto final. Solo puede haber **una abierta** a la vez. |
| **Movimiento**         | Cada cobro (`Pago`) registrado dentro de una caja abierta.                                                                         |
| **Pedido**             | Comanda de una mesa con uno o más detalles. Tiene un total y un estado.                                                            |
| **Detalle**            | Ítem de un pedido: producto, cantidad y subtotal (`precio × cantidad`).                                                            |
| **Cobro / Pago**       | Acción que convierte un pedido `entregado` en `pagado`, registra el pago y libera la mesa. No existen cobros parciales.            |
| **Ticket promedio**    | `total_vendido / pedidos_cobrados` en un período de reporte.                                                                       |
| **Diferencia de caja** | `monto_final - (monto_inicial + ventas_efectivo)` al cerrar.                                                                       |
| **Cutover**            | Momento en que el backend NestJS reemplaza definitivamente al FastAPI (MIG-42).                                                    |

---

## 5. Términos técnicos del harness

| Término      | Significado                                                                                                                                                             |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Harness**  | Conjunto de documentos y reglas que permiten a un agente o dev trabajar sin contexto previo: constitución, arquitectura, convenciones, docs por módulo, memoria y ADRs. |
| **ADR**      | Architecture Decision Record. Registro inmutable de una decisión con contexto, alternativas y consecuencias.                                                            |
| **DoD**      | Definition of Done. Criterios que debe cumplir un cambio para considerarse terminado.                                                                                   |
| **Memoria**  | `.agents/memory.md`: estado vivo del proyecto, no documentación de diseño.                                                                                              |
| **Legacy**   | Backend FastAPI en Python, operativo hasta el cutover.                                                                                                                  |
| **Contrato** | `docs/api-contract.md` + `docs/openapi.yaml`; fuente de verdad de la API.                                                                                               |

---

## 6. Abreviaturas de tickets

| Prefijo | Significado                                                      |
| ------- | ---------------------------------------------------------------- |
| `MIG-`  | Migración FastAPI → NestJS (epic MIG-1, sprint S0 y siguientes). |
| `CFB-`  | Backend legacy Cafecito (referencias históricas en comentarios). |

Todo `TODO` y todo PR referencian un ticket. Sin ticket, no hay cambio.
