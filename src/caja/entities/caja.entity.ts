import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { numericTransformer } from '../../common/transformers/numeric.transformer.js';
import { utcTimestampTransformer } from '../../common/transformers/utc-timestamp.transformer.js';
import type { CajaEstado } from '../estado-caja.js';

/** Turno de caja independiente; `total_ventas` se deriva de pagos. */
@Entity('cajas')
export class Caja {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    name: 'fecha_apertura',
    type: 'timestamp',
    default: () => 'now()',
    transformer: utcTimestampTransformer,
  })
  fechaApertura!: Date;

  @Column({
    name: 'fecha_cierre',
    type: 'timestamp',
    nullable: true,
    transformer: utcTimestampTransformer,
  })
  fechaCierre!: Date | null;

  @Column({
    name: 'monto_inicial',
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: numericTransformer,
  })
  montoInicial!: number;

  @Column({
    name: 'monto_final',
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  montoFinal!: number | null;

  @Column({ name: 'estado', type: 'varchar', length: 20, default: 'abierta' })
  estado!: CajaEstado;
}
