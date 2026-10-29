import type { Relation } from 'typeorm';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { numericTransformer } from '../../common/transformers/numeric.transformer.js';
import { utcTimestampTransformer } from '../../common/transformers/utc-timestamp.transformer.js';
import { Mesa } from '../../mesas/entities/mesa.entity.js';
import { Pago } from '../../pagos/entities/pago.entity.js';
import { Usuario } from '../../users/entities/usuario.entity.js';
import type { PedidoEstado } from '../pedido-estado.js';
import { DetallePedido } from './detalle-pedido.entity.js';

/**
 * Pedido (comanda) de una mesa. Mapea la tabla `pedidos` del backend legacy
 * (`models/pedido.py`, MIG-30):
 *
 * | Propiedad   | Columna      | Tipo            | Restricciones                        |
 * | ----------- | ------------ | --------------- | ------------------------------------ |
 * | `id`        | `id`         | `serial`        | PK, autoincremental                  |
 * | `mesaId`    | `mesa_id`    | `int`           | FK → `mesas`, not null               |
 * | `usuarioId` | `usuario_id` | `int`           | FK → `usuarios`, not null            |
 * | `estado`    | `estado`     | `varchar(30)`   | default `pendiente`, 6 estados       |
 * | `total`     | `total`      | `numeric(10,2)` | default `0`, `number` con transformer|
 * | `fecha`     | `fecha`      | `timestamp`     | default `now()`, UTC naive           |
 *
 * **FK escalar + relación:** `mesaId` y `usuarioId` se mapean como columnas
 * explícitas y además como `@ManyToOne` con `@JoinColumn` sobre la misma columna
 * física. TypeORM reutiliza la columna existente (`RelationJoinColumnBuilder`),
 * así que no hay DDL duplicado: el scalar sirve para consultas y para el
 * service de MIG-33, y la relación permite hidratar `mesa` y `usuario` con
 * `relations` explícitas sin `eager`.
 *
 * **Cascada:** `detalles` usa `cascade: ['insert']` y nada más. Los detalles son
 * una foto del precio al momento del pedido; habilitar `update` o `remove`
 * dejaría reescribir ventas históricas. No hay endpoint de borrado de pedidos.
 *
 * **`pagos`:** relación inversa de solo lectura. El pago se crea dentro de la
 * transacción del cobro (MIG-33), no por cascada desde el pedido. La unicidad
 * `pagos_pedido_id_key` es la que impide cobrar dos veces.
 *
 * Sin `@Unique` propio: el legacy no define una restricción única sobre
 * `pedidos`. Los nombres de FK siguen el default de PostgreSQL
 * (`<tabla>_<columna>_fkey`) y MIG-44 los confirma contra la base real.
 */
@Entity('pedidos')
export class Pedido {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'mesa_id', type: 'int' })
  mesaId!: number;

  @Column({ name: 'usuario_id', type: 'int' })
  usuarioId!: number;

  @Column({ type: 'varchar', length: 30, default: 'pendiente' })
  estado!: PedidoEstado;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  total!: number;

  @Column({
    type: 'timestamp',
    default: () => 'now()',
    transformer: utcTimestampTransformer,
  })
  fecha!: Date;

  @ManyToOne(() => Mesa, { nullable: false })
  @JoinColumn({
    name: 'mesa_id',
    foreignKeyConstraintName: 'pedidos_mesa_id_fkey',
  })
  mesa!: Relation<Mesa>;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({
    name: 'usuario_id',
    foreignKeyConstraintName: 'pedidos_usuario_id_fkey',
  })
  usuario!: Relation<Usuario>;

  @OneToMany(() => DetallePedido, (detalle) => detalle.pedido, {
    cascade: ['insert'],
  })
  detalles!: Relation<DetallePedido[]>;

  @OneToMany(() => Pago, (pago) => pago.pedido)
  pagos!: Relation<Pago[]>;
}
