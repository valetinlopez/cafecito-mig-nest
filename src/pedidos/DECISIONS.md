# Decisiones — `pedidos`

---

## D-01 — La creación es una transacción

**Decisión:** validar mesa/productos, calcular totales, insertar pedido y
detalles, descontar stock y actualizar la mesa dentro de una `QueryRunner` /
`dataSource.transaction`.

**Motivo:** si falla el descuento de stock después de insertar el pedido, queda
un pedido fantasma y stock inconsistente. La atomicidad no es opcional en un
sistema de caja.

**Verificación:** test que fuerza un error a mitad de la operación y comprueba
que no quedó nada escrito.

---

## D-02 — El total se calcula en el servidor

**Decisión:** el cliente envía `producto_id` y `cantidad`; el servidor resuelve
precio y calcula `subtotal`/`total`.

**Motivo:** confiar en un precio del cliente permite manipular el total. Además
el contrato no envía precios en el request.

---

## D-03 — El descuento de stock es atómico y condicional

**Decisión:** `UPDATE productos SET stock = stock - :n WHERE id = :id AND stock >= :n`
y verificar filas afectadas.

**Motivo:** dos pedidos concurrentes sobre el mismo producto pueden pasar la
validación de stock a la vez y dejar stock negativo. El `WHERE` lo impide a nivel
de base.

---

## D-04 — Transiciones en un mapa único

**Decisión:** `TRANSICIONES_PEDIDO` como fuente de verdad, compartida entre
`PATCH` y `POST /pago`.

**Motivo:** `entregado → pagado` solo es válido por el endpoint de pago; si el
mapa no lo distingue, un `PATCH` podría marcar un pedido como pagado sin registrar
el cobro.

**Implementación:** dos mapas o un parámetro `origen: 'manual' | 'pago'`.

---

## D-05 — `GET /pedidos/` excluye cerrados

**Decisión:** filtrar `estado NOT IN ('pagado', 'cancelado')`.

**Motivo:** el legacy muestra solo pedidos activos en la operación diaria. Los
cerrados se consultan por reportes, no por esta lista.

---

## D-06 — Reposición de stock al cancelar

**Decisión:** al pasar a `cancelado`, devolver el stock de cada detalle.

**Motivo:** el stock se descontó al crear. No reponerlo genera faltantes
ficticios. Debe hacerse en la misma transacción que el cambio de estado y ser
idempotente (no reponer dos veces si ya estaba cancelado).

---

## D-07 — `POST /pago` es una acción, no un `PATCH`

**Decisión:** mantener el path del legacy y responder `200`.

**Motivo:** el contrato lo define como acción con efectos (crea `Pago`, cierra el
pedido, libera la mesa). Cambiarlo a `PATCH /pedidos/{id}` con `estado=pagado`
rompería el front y mezclaría transición manual con cobro.

---

## D-08 — Dependencias sin `forwardRef`

**Decisión:** `pedidos` importa `MesasModule`, `ProductosModule`, `CajaModule` y
`PagosModule`; ninguno de esos importa `pedidos` a nivel de módulo.

**Motivo:** los efectos sobre la mesa los ejecuta `pedidos`; `mesas` no necesita
importar `pedidos` si la validación de "pedido activo" se resuelve con una
consulta al repositorio de pedidos o un método exportado sin dependencia
circular.

**Regla:** si aparece un ciclo, se mueve la regla al módulo dueño, no se usa
`forwardRef` (constitución §3).

---

## D-09 — Relaciones completas desde MIG-30

**Decisión:** `Pedido` declara `@ManyToOne` con `Mesa` y `Usuario`,
`@OneToMany` con `DetallePedido` (bidireccional, inversa en
`DetallePedido.pedido`) y `@OneToMany` con `Pago` (inversa en `Pago.pedido`).

**Motivo:** el ticket MIG-30 las pide explícitamente y todas las contrapartes ya
existen (`MIG-27` mesas, `MIG-22` usuarios, `MIG-31` pagos). La convención §6.1
habilita relaciones **cuando existen ambas entities**. Sin ellas,
`PedidoResponseDto` no puede hidratar `mesa`/`usuario` en una consulta y
aparecería N+1 en el listado.

**Consecuencia:** `Pago` incorpora su `@ManyToOne(Pedido)` (se actualiza
`src/pagos/DECISIONS.md` D-09) y `Pedido.pagos` queda como inversa de solo
lectura. Las relaciones son metadata de TypeORM, no providers de Nest, así que
no hay `forwardRef`. MIG-44 confirma las FK contra la base real.

**Nota:** `pagos` se declara `@OneToMany` como pide el ticket y como lo modela
el legacy (`Pedido.pagos`), aunque la restricción `pagos_pedido_id_key` lo
restringe a 0..1. Se conserva la forma de colección para no divergir del modelo
heredado; la unicidad es la que impide registrar dos cobros.

---

## D-10 — FK escalar y relación sobre la misma columna

**Decisión:** `mesaId`, `usuarioId`, `pedidoId` y `productoId` se mapean como
columnas explícitas y además como `@ManyToOne` con `@JoinColumn` al mismo nombre
físico.

**Motivo:** MIG-33 necesita filtrar y asignar por id sin cargar la relación
(`where: { mesaId }`), y el response necesita la entidad hidratada. TypeORM
reutiliza la columna existente al construir el join column, así que no hay DDL
duplicado ni doble escritura.

---

## D-11 — Cascada solo para insertar detalles

**Decisión:** `detalles` usa `cascade: ['insert']`; nunca `update` ni `remove`.

**Motivo:** los detalles son una foto del precio al momento del pedido. Permitir
`remove`/`update` en cascada dejaría reescribir ventas históricas, y no existe
un endpoint de borrado de pedidos en el contrato. El `Pago` tampoco se crea por
cascada: lo registra la transacción del cobro (MIG-33).

---

## D-12 — `subtotal` es histórico y no se recalcula

**Decisión:** la entity persiste `subtotal`; `DetallePedidoResponseDto` lo
expone tal cual y nunca lo deriva de `Producto.precio`.

**Motivo:** si el producto cambia de precio, la venta ya registrada debe
conservar el valor cobrado. Recalcular al leer rompería reportes y arqueos.

---

## D-13 — DTOs separados por operación y por recurso anidado

**Decisión:** `DetallePedidoCreateDto`, `CreatePedidoDto`, `UpdatePedidoDto`,
`PedidoPagoDto`, `DetallePedidoResponseDto` y `PedidoResponseDto`.

**Motivo:** el request no declara `total`, `subtotal` ni `usuario_id` porque los
calcula el servidor; el response anida `MesaResponseDto` y `UsuarioResponseDto`
en lugar de serializar entities (constitución §8). `PedidoPagoDto` no tiene
`monto` (D-03 de `pagos`).

**Consecuencia:** `PedidoResponseDto.fromEntity()` exige `mesa`, `usuario` y
`detalles` hidratados y falla explícito si faltan; nunca emite un pedido
incompleto que rompería el front.

---

## D-14 — Nombres de tabla y FK provisionales

**Decisión:** las tablas son `pedidos` y `detalle_pedidos`; las FK se declaran
con el default de PostgreSQL (`pedidos_mesa_id_fkey`,
`pedidos_usuario_id_fkey`, `detalle_pedidos_pedido_id_fkey`,
`detalle_pedidos_producto_id_fkey`, `pagos_pedido_id_fkey`).

**Motivo:** `detalle_pedidos` es el nombre que declara MIG-30 y la documentación
del módulo; el default de PostgreSQL evita que `schema:log` proponga recrear
restricciones con nombres generados por TypeORM.

**Consecuencia:** MIG-44 valida nombres, nulabilidad y tipos contra la base
compartida. Si alguno difiere, se corrige en una migración revisada, no con
`synchronize` contra Neon (constitución §4).
