import type { Relation } from 'typeorm';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { numericTransformer } from '../../common/transformers/numeric.transformer.js';
import { Producto } from '../../productos/entities/producto.entity.js';
import { Pedido } from './pedido.entity.js';

/**
 * Ítem de un pedido. Mapea la tabla `detalle_pedidos` del backend legacy
 * (`models/detalle_pedido.py`, MIG-30):
 *
 * | Propiedad    | Columna       | Tipo            | Restricciones                     |
 * | ------------ | ------------- | --------------- | --------------------------------- |
 * | `id`         | `id`          | `serial`        | PK, autoincremental               |
 * | `pedidoId`   | `pedido_id`   | `int`           | FK → `pedidos`, not null          |
 * | `productoId` | `producto_id` | `int`           | FK → `productos`, not null        |
 * | `cantidad`   | `cantidad`    | `int`           | not null, `> 0` se valida en DTO  |
 * | `subtotal`   | `subtotal`    | `numeric(10,2)` | `number` vía `numericTransformer` |
 *
 * **`subtotal` es histórico:** guarda `precio × cantidad` del instante en que se
 * creó el pedido. No se recalcula al leer ni al cambiar de estado: si mañana el
 * producto sube de precio, la venta ya registrada no cambia. Esa regla la
 * implementa `PedidosService` (MIG-33); la entity solo la persiste.
 *
 * El nombre `detalle_pedidos` es el que declara el ticket y la documentación del
 * módulo; MIG-44 lo confirma contra la base real (pregunta abierta del
 * `.agents/memory.md`).
 *
 * Igual que en `Pedido`, el FK escalar convive con la relación `@ManyToOne`
 * sobre la misma columna física: no hay DDL duplicado y evita `eager`.
 */
@Entity('detalle_pedidos')
export class DetallePedido {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'pedido_id', type: 'int' })
  pedidoId!: number;

  @Column({ name: 'producto_id', type: 'int' })
  productoId!: number;

  @Column({ type: 'int' })
  cantidad!: number;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: numericTransformer,
  })
  subtotal!: number;

  @ManyToOne(() => Pedido, (pedido) => pedido.detalles, { nullable: false })
  @JoinColumn({
    name: 'pedido_id',
    foreignKeyConstraintName: 'detalle_pedidos_pedido_id_fkey',
  })
  pedido!: Relation<Pedido>;

  @ManyToOne(() => Producto, { nullable: false })
  @JoinColumn({
    name: 'producto_id',
    foreignKeyConstraintName: 'detalle_pedidos_producto_id_fkey',
  })
  producto!: Relation<Producto>;
}
