import type { Relation } from 'typeorm';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
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
 * | `pedidoId`   | `pedido_id`   | `int`           | `UNIQUE`, not null               |
 * | `cajaId`     | `caja_id`     | `int`           | nullable (provisional)           |
 * | `usuarioId`  | `usuario_id`  | `int`           | nullable (provisional)           |
 * | `metodoPago` | `metodo_pago` | `varchar(30)`   | 5 valores del glosario           |
 * | `monto`      | `monto`       | `numeric(10,2)` | `number` vía `numericTransformer` |
 * | `fecha`      | `fecha`       | `timestamp`     | default `now()`, UTC naive       |
 *
 * El nombre de la restricción unique se declara explícito
 * (`pagos_pedido_id_key`) porque es el que PostgreSQL generó al crear la tabla
 * desde Python. Sin el nombre, `schema:log` (MIG-44) propone recrearla.
 *
 * **Relaciones:** `pedido` se declara acá desde MIG-30, cuando `Pedido` pasó a
 * existir, para completar el `@OneToMany(() => Pago)` que pide el ticket. La
 * relación reutiliza la columna física `pedido_id` (`@JoinColumn`), no agrega
 * DDL duplicado y se declara con FK explícita (`pagos_pedido_id_fkey`); MIG-44
 * confirma el nombre contra la base real. La relación con `cajas` sigue
 * diferida a MIG-32/MIG-44 porque esa entity todavía no existe; `cajaId` y
 * `usuarioId` permanecen escalares y nullable (ver `DECISIONS.md` D-09).
 *
 * `cajaId` y `usuarioId` son nullable a propósito: hay pagos históricos previos
 * a la apertura de caja y usuarios dados de baja lógicamente (el contrato ya
 * tipa `usuario_nombre: string | null`, ver `DECISIONS.md` D-08). La regla
 * "todo cobro nuevo pertenece a la caja abierta" se valida en el service del
 * cobro, no con un `NOT NULL`.
 */
@Entity('pagos')
@Unique('pagos_pedido_id_key', ['pedidoId'])
export class Pago {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'pedido_id', type: 'int' })
  pedidoId!: number;

  @Column({ name: 'caja_id', type: 'int', nullable: true })
  cajaId!: number | null;

  @Column({ name: 'usuario_id', type: 'int', nullable: true })
  usuarioId!: number | null;

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
    default: () => 'now()',
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
