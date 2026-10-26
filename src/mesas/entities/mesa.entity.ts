import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';
import type { MesaEstado } from '../mesa-estado.js';

/** Mapea la tabla compartida `mesas`; el nombre de unique se confirma en MIG-44. */
@Entity('mesas')
@Unique('mesas_numero_key', ['numero'])
export class Mesa {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  numero!: number;

  @Column({ type: 'varchar', default: 'libre' })
  estado!: MesaEstado;
}
