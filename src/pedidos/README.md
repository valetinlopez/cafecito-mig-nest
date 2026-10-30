# Módulo `pedidos`

| Campo        | Valor                                          |
| ------------ | ---------------------------------------------- |
| Estado       | **Implementado** (MIG-30 + MIG-33)             |
| Entities     | `Pedido` · `DetallePedido`                     |
| Endpoints    | 5 (ver [`CONTRACT.md`](./CONTRACT.md))         |
| Dependencias | `mesas`, `productos`, `users`, `caja`, `pagos` |
| Tests        | 390 unitarios; 74 e2e OK, 2 omitidos; gates OK |

## 1. Responsabilidad

Es el **corazón del negocio**: crear comandas, calcular totales, descontar stock,
avanzar estados y disparar el cobro. Coordina mesas, productos y caja.

Es el módulo con más reglas y el que más depende de otros.

## 2. Estado actual

```
src/pedidos/
├── pedidos.module.ts              # módulo funcional
├── pedidos.controller.ts          # cinco endpoints contractuales
├── pedidos.service.ts             # lecturas, transiciones, stock y cobro
├── pedidos.service.spec.ts
├── pedido-estado.ts               # PEDIDO_ESTADOS + PedidoEstado
├── dto/
│   ├── detalle-pedido-create.dto.ts
│   ├── create-pedido.dto.ts
│   ├── update-pedido.dto.ts
│   ├── pedido-pago.dto.ts
│   ├── detalle-pedido-response.dto.ts
│   └── pedido-response.dto.ts
├── entities/
│   ├── pedido.entity.ts
│   └── detalle-pedido.entity.ts
└── README.md · CONTRACT.md · DECISIONS.md · AGENTS.md
```

MIG-30 entregó persistencia y contrato; MIG-33 implementa los cinco endpoints,
las reglas del ciclo de vida, locks y transacciones que mantienen sincronizados
pedido, inventario, mesa, caja y pago.

## 4. Modelo

| Tabla             | Campo clave                                               | Notas                                 |
| ----------------- | --------------------------------------------------------- | ------------------------------------- |
| `pedidos`         | `id`, `estado`, `total`, `fecha`, `mesa_id`, `usuario_id` | `total` `numeric(10,2)` → `number`    |
| `detalle_pedidos` | `id`, `pedido_id`, `producto_id`, `cantidad`, `subtotal`  | `subtotal` histórico, `numeric(10,2)` |

Relaciones:

| Origen                   | Relación    | Destino         | Cascada  |
| ------------------------ | ----------- | --------------- | -------- |
| `Pedido.mesa`            | `ManyToOne` | `Mesa`          | —        |
| `Pedido.usuario`         | `ManyToOne` | `Usuario`       | —        |
| `Pedido.detalles`        | `OneToMany` | `DetallePedido` | `insert` |
| `Pedido.pagos`           | `OneToMany` | `Pago`          | —        |
| `DetallePedido.pedido`   | `ManyToOne` | `Pedido`        | —        |
| `DetallePedido.producto` | `ManyToOne` | `Producto`      | —        |

Estados y transiciones: [`docs/glossary.md`](../../docs/glossary.md) §3.1.
Decisiones de mapeo: [`DECISIONS.md`](./DECISIONS.md) D-09 a D-14.

## 5. Reglas de negocio (MIG-33)

### Crear pedido

1. La mesa existe.
2. La mesa no tiene otro pedido activo.
3. Cada producto existe y está `disponible`.
4. Hay stock suficiente; se descuenta.
5. `total = Σ(precio × cantidad)`; `subtotal` por detalle.
6. La mesa pasa a `ocupada`.
7. Todo ocurre en **una transacción**.

Errores `400`: `Mesa N no encontrada`, `La mesa ya tiene un pedido activo`,
`Producto N no encontrado`, `Producto N no disponible`, `Stock insuficiente para
'Nombre' (disponible: X, solicitado: Y)`.

### Cambiar estado

Las transiciones permitidas están centralizadas en `TRANSICIONES_PEDIDO`.
Cada cambio bloquea el pedido; al entregar, la mesa pasa a `pendiente_cobro`;
al cancelar, se libera y se repone el stock agregado por producto. Los estados
terminales no admiten nuevas transiciones.

### Cobrar

Solo se cobra un pedido `entregado`. El pago, la transición a `pagado` y la
liberación de la mesa comparten una transacción; se bloquean el pedido y la caja
abierta. Se permite total cero y no se aceptan pagos duplicados.

## 6. Consultas

`GET /pedidos/` devuelve solo pedidos activos, ordenados por fecha descendente;
`GET /pedidos/{id}` devuelve el pedido o `404`. Ambas respuestas se proyectan
mediante `PedidoResponseDto.fromEntity()`.

## 7. Pruebas y estado MIG-33

Los unitarios cubren consultas, creación/stock, locks ordenados, los 36 pares de
transición, reposición y cobro; el e2e cubre las cinco rutas y sus guards. Los
gates están en verde. Los tests unitarios no ejercitan rollback físico ni
concurrencia real de PostgreSQL. Ver
[`specs/033-pedidos/validate.md`](../../specs/033-pedidos/validate.md) para la
evidencia y sus límites.

## 8. Tests entregados en MIG-30

Las pruebas de entities verifican el mapeo de columnas y las relaciones; las
pruebas DTO verifican que las respuestas incluyan solo los campos del contrato,
sin datos sensibles, y que `fromEntity()` requiera las relaciones hidratadas.

## 9. Referencias
