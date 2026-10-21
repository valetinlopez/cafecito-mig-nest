# Módulo `pedidos`

| Campo        | Valor                                               |
| ------------ | --------------------------------------------------- |
| Estado       | **Scaffold** (módulo registrado, sin código propio) |
| Entities     | `Pedido` · `DetallePedido`                          |
| Endpoints    | 5 (ver [`CONTRACT.md`](./CONTRACT.md))              |
| Dependencias | `mesas`, `productos`, `users`, `caja`, `pagos`      |
| Tests        | Pendientes                                          |

---

## 1. Responsabilidad

Es el **corazón del negocio**: crear comandas, calcular totales, descontar stock,
avanzar estados y disparar el cobro. Coordina mesas, productos y caja.

Es el módulo con más reglas y el que más depende de otros.

---

## 2. Estado actual

```
src/pedidos/
└── pedidos.module.ts    # @Module({}) — vacío
```

---

## 3. Estructura objetivo

```
src/pedidos/
├── pedidos.module.ts
├── pedidos.controller.ts
├── pedidos.service.ts
├── pedidos.service.spec.ts
├── dto/
│   ├── create-pedido.dto.ts
│   ├── update-pedido.dto.ts
│   ├── pedido-pago.dto.ts
│   └── pedido-response.dto.ts
├── entities/
│   ├── pedido.entity.ts
│   └── detalle-pedido.entity.ts
├── README.md · CONTRACT.md · DECISIONS.md
```

---

## 4. Modelo esperado

| Tabla             | Campo clave                                               | Notas                      |
| ----------------- | --------------------------------------------------------- | -------------------------- |
| `pedidos`         | `id`, `estado`, `total`, `fecha`, `mesa_id`, `usuario_id` | `total` `numeric(10,2)`    |
| `detalle_pedidos` | `id`, `pedido_id`, `producto_id`, `cantidad`, `subtotal`  | `subtotal` `numeric(10,2)` |

Estados y transiciones: [`docs/glossary.md`](../../docs/glossary.md) §3.1.

---

## 5. Reglas de negocio

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
- Incluye `mesa`, `usuario` y `detalles`.
- Sin paginación (D-10).

---

## 7. Tests esperados

- Crear pedido calcula total y subtotales y descuenta stock.
- Crear con mesa ocupada → `400`.
- Crear con stock insuficiente → `400`.
- Transición válida e inválida.
- Cancelar repone stock y libera mesa.
- Cobrar sin caja abierta → `400`.
- Cobrar pedido no entregado → `400`.
- e2e del shape completo con relaciones anidadas.

---

## 8. Referencias

- [`CONTRACT.md`](./CONTRACT.md) · [`DECISIONS.md`](./DECISIONS.md)
- `docs/api-contract.md` §6.5
- `docs/glossary.md` §3.1
