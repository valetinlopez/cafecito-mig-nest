import { Exclude } from 'class-transformer';
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
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
 * | `activo`       | `activo`        | `boolean`      | lo asigna la app    |
 *
 * La unicidad del email es un índice único (`ix_usuarios_email`), no una
 * restricción: es lo que creó el legacy. `activo` admite `NULL` en la base y no
 * tiene default; la aplicación siempre lo asigna (ADR 0009).
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
@Index('ix_usuarios_id', ['id'])
@Index('ix_usuarios_email', ['email'], { unique: true })
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

  @Column({ type: 'boolean', nullable: true })
  activo!: boolean;
}
