import { Column, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';
import type { MesaEstado } from '../mesa-estado.js';

/**
 * Mapea la tabla compartida `mesas`. La base no tiene default para `estado`: lo
 * asigna siempre la aplicación, por eso conserva su tipo no nulo (ADR 0009).
 */
@Entity('mesas')
@Index('ix_mesas_id', ['id'])
@Unique('mesas_numero_key', ['numero'])
export class Mesa {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  numero!: number;

  @Column({ type: 'varchar', length: 30, nullable: true })
  estado!: MesaEstado;
}
