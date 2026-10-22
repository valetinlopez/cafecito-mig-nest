import { Exclude } from 'class-transformer';
import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';
import type { Rol } from '../rol.js';

/**
 * Usuario del sistema. Mapea 1 a 1 la tabla `usuarios` del backend legacy
 * (modelo `usuario.py`, MIG-22):
 *
 * | Propiedad      | Columna         | Tipo           | Restricciones       |
 * | -------------- | --------------- | -------------- | ------------------- |
 * | `id`           | `id`            | `serial`       | PK, autoincremental |
 * | `nombre`       | `nombre`        | `varchar(100)` | not null            |
 * | `email`        | `email`         | `varchar(150)` | `UNIQUE`, not null  |
 * | `passwordHash` | `password_hash` | `varchar(255)` | not null            |
 * | `rol`          | `rol`           | `varchar(20)`  | `admin` \| `mozo`   |
 * | `activo`       | `activo`        | `boolean`      | default `true`      |
 *
 * El nombre de la restricción unique se declara explícito
 * (`usuarios_email_key`) porque es el que PostgreSQL generó al crear la tabla
 * desde Python. Sin el nombre, TypeORM propone recrearla en `schema:log`
 * (MIG-44).
 *
 * `passwordHash` lleva `@Exclude()` como segunda barrera: aunque el borde HTTP
 * siempre pasa por `UsuarioResponseDto.fromEntity()` (constitución §8), si
 * alguna vez se serializa la entity con `class-transformer` el hash no sale.
 *
 * Las relaciones (`pedidos`, `pagos`) se agregan en sus tickets, cuando existan
 * ambas entities. Declararlas antes obligaría a un mapeo parcial de una tabla
 * compartida con producción (convenciones §6.1).
 */
@Entity('usuarios')
@Unique('usuarios_email_key', ['email'])
export class Usuario {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 100 })
  nombre!: string;

  @Column({ type: 'varchar', length: 150 })
  email!: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  @Exclude()
  passwordHash!: string;

  @Column({ type: 'varchar', length: 20 })
  rol!: Rol;

  @Column({ type: 'boolean', default: true })
  activo!: boolean;
}
