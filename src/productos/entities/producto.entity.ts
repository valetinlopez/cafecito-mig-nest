import type { Relation } from 'typeorm';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Categoria } from '../../categorias/entities/categoria.entity.js';

/**
 * Mapea la tabla compartida `productos`. La base no tiene defaults: `stock`,
 * `stockMinimo` y `disponible` los asigna siempre la aplicación, por eso conservan
 * su tipo no nulo aunque la base admita `NULL` (ADR 0009).
 */
@Entity('productos')
@Index('ix_productos_id', ['id'])
export class Producto {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 100 })
  nombre!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  descripcion!: string | null;

  // pg devuelve numeric como string. El DTO normaliza a number en MIG-44.
  @Column({ type: 'numeric', precision: 10, scale: 2 })
  precio!: string;

  @Column({ type: 'int', nullable: true })
  stock!: number;

  @Column({ type: 'int', name: 'stock_minimo' })
  stockMinimo!: number;

  @Column({ type: 'boolean', nullable: true })
  disponible!: boolean;

  @Column({ type: 'int', name: 'categoria_id' })
  categoriaId!: number;

  /** Declara la FK real. No se carga con `relations`: la hidrata el service. */
  @ManyToOne(() => Categoria, { nullable: false })
  @JoinColumn({
    name: 'categoria_id',
    foreignKeyConstraintName: 'productos_categoria_id_fkey',
  })
  categoria?: Relation<Categoria>;
}