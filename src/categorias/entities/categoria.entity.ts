import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

/**
 * Categoría de productos. Mapea 1 a 1 la tabla `categorias` del backend legacy:
 *
 * | Propiedad | Columna  | Tipo          | Restricciones       |
 * | --------- | -------- | ------------- | ------------------- |
 * | `id`      | `id`     | `serial`      | PK, autoincremental |
 * | `nombre`  | `nombre` | `varchar(50)` | `UNIQUE`, not null  |
 *
 * El nombre de la restricción unique se declara explícito
 * (`categorias_nombre_key`) porque es el que PostgreSQL generó por defecto al
 * crear la tabla desde el backend Python. Así `typeorm schema:log` (MIG-44) no
 * propone recrearla.
 *
 * La relación inversa `@OneToMany(() => Producto, ...)` se agrega en MIG-29,
 * cuando exista la entity `Producto`. Declararla antes obligaría a crear un
 * mapeo parcial de la tabla `productos`; como la base es compartida y en
 * desarrollo corre `synchronize`, TypeORM podría alterar columnas reales.
 */
@Entity('categorias')
@Unique('categorias_nombre_key', ['nombre'])
export class Categoria {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 50 })
  nombre!: string;
}
