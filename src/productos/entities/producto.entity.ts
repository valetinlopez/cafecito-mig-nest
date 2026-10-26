import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** Entity temporal de Productos; el mapeo físico se confirma en MIG-44. */
@Entity('productos')
export class Producto {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 100 })
  nombre!: string;

  @Column({ type: 'varchar', nullable: true })
  descripcion!: string | null;

  // pg devuelve numeric como string. El DTO normaliza a number en MIG-44.
  @Column({ type: 'numeric', precision: 10, scale: 2 })
  precio!: string;

  @Column({ type: 'int', default: 0 })
  stock!: number;

  @Column({ type: 'int', name: 'stock_minimo', default: 5 })
  stockMinimo!: number;

  @Column({ type: 'boolean', default: true })
  disponible!: boolean;

  @Column({ type: 'int', name: 'categoria_id' })
  categoriaId!: number;

  /** Propiedad hidratada explícitamente en el service, no es una relación ORM. */
  categoria?: { id: number; nombre: string };
}