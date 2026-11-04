import type { Relation } from 'typeorm';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { numericTransformer } from '../../common/transformers/numeric.transformer.js';
import { utcTimestampTransformer } from '../../common/transformers/utc-timestamp.transformer.js';
import { Pedido } from '../../pedidos/entities/pedido.entity.js';
import type { MetodoPago } from '../metodo-pago.js';

/**
 * Cobro de un pedido. Mapea la tabla `pagos` del backend legacy (`models/pago.py`,
 * MIG-31):
 *
 * | Propiedad    | Columna       | Tipo            | Restricciones                    |
 * | ------------ | ------------- | --------------- | -------------------------------- |
 * | `id`         | `id`          | `serial`        | PK, autoincremental              |
 * | `pedidoId`   | `pedido_id`   | `int`           | FK → `pedidos`, not null         |
 * | `metodoPago` | `metodo_pago` | `varchar(30)`   | 5 valores del glosario           |
 * | `monto`      | `monto`       | `numeric(10,2)` | `number` vía `numericTransformer` |
 * | `fecha`      | `fecha`       | `timestamp`     | la asigna la aplicación, UTC naive |
 *
 * **Esquema real (ADR 0009):** la tabla no guarda la caja ni quién cobró, y no
 * tiene restricción única sobre `pedido_id`. La caja se deduce por el período
 * (`pago-periodo-caja.ts`), el usuario sale del pedido y el doble cobro lo impide
 * el bloqueo del pedido en la transacción del cobro.
 *
 * **Relaciones:** `pedido` reutiliza la columna física `pedido_id`
 * (`@JoinColumn`), sin DDL duplicado, con la FK real `pagos_pedido_id_fkey`.
 */
@Entity('pagos')
@Index('ix_pagos_id', ['id'])
export class Pago {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'pedido_id', type: 'int' })
  pedidoId!: number;

  @Column({ name: 'metodo_pago', type: 'varchar', length: 30 })
  metodoPago!: MetodoPago;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: numericTransformer,
  })
  monto!: number;

  @Column({
    type: 'timestamp',
    nullable: true,
    transformer: utcTimestampTransformer,
  })
  fecha!: Date;

  @ManyToOne(() => Pedido, (pedido) => pedido.pagos)
  @JoinColumn({
    name: 'pedido_id',
    foreignKeyConstraintName: 'pagos_pedido_id_fkey',
  })
  pedido!: Relation<Pedido>;
}
