# Módulo `pedidos`

| Campo        | Valor                                                         |
| ------------ | ------------------------------------------------------------- |
| Estado       | **Entities + DTOs** (MIG-30); service y controller en MIG-33  |
| Entities     | `Pedido` · `DetallePedido`                                    |
| Endpoints    | 5 (ver [`CONTRACT.md`](./CONTRACT.md)) — pendientes de MIG-33 |
| Dependencias | `mesas`, `productos`, `users`, `caja`, `pagos`                |
| Tests        | ✅ 49 unitarios del módulo                                    |

---

## 1. Responsabilidad

Es el **corazón del negocio**: crear comandas, calcular totales, descontar stock,
avanzar estados y disparar el cobro. Coordina mesas, productos y caja.

Es el módulo con más reglas y el que más depende de otros.

---

## 2. Estado actual

```
src/pedidos/
├── pedidos.module.ts              # TypeOrmModule.forFeature([Pedido, DetallePedido])
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

MIG-30 entrega **solo persistencia y contrato**: entities, DTOs, validaciones de
forma y tests. No hay `PedidosService` ni `PedidosController` todavía; los
endpoints de §6.5 se implementan en MIG-33.

---

## 3. Estructura objetivo (MIG-33)

```
src/pedidos/
├── pedidos.service.ts
├── pedidos.service.spec.ts
├── pedidos.controller.ts
└── … (lo ya entregado por MIG-30)
```

---

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

---

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

- Solo transiciones manuales del glosario.
- `entregado` → mesa `pendiente_cobro`.
- `cancelado` → reponer stock y mesa `libre`.
- `pagado` y `cancelado` son finales.

### Cobrar

- Solo pedido `entregado`.
- Requiere caja abierta.
- Crea `Pago`, marca `pagado` y libera la mesa.
- Sin cobros parciales.
- Errores: `Solo se puede cobrar un pedido en estado 'entregado' (estado actual:
'X')` / `No se puede cobrar un pedido sin una caja abierta`.

---

## 6. Consultas

- `GET /pedidos/` devuelve **solo activos**: excluye `pagado` y `cancelado`.
- Incluye `mesa`, `usuario` y `detalles` con `relations` explícitas (sin N+1).
- Sin paginación (D-10).

---

## 7. Tests entregados en MIG-30

- Enum de estados completo y sin duplicados.
- Mapeo de tablas, columnas, FK y transformers de ambas entities.
- Metadata de TypeORM resuelto con las relaciones cruzadas (sin ciclos rotos).
- `CreatePedidoDto`: mínimo un detalle, `cantidad >= 1`, ids enteros y descarte
  de campos que calcula el servidor.
- `UpdatePedidoDto`: acepta los 6 estados y rechaza el resto.
- `PedidoPagoDto`: acepta los 5 métodos y descarta `monto`.
- `PedidoResponseDto`: shape exacto, decimales como `number`, fecha ISO con `Z`,
  sin `password_hash` y falla si faltan relaciones hidratadas.

---

## 8. Referencias

- [`CONTRACT.md`](./CONTRACT.md) · [`DECISIONS.md`](./DECISIONS.md)
- `docs/api-contract.md` §6.5
- `docs/glossary.md` §3.1
