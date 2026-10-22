import { ApiProperty } from '@nestjs/swagger';
import type { Usuario } from '../entities/usuario.entity.js';
import { ROLES, type Rol } from '../rol.js';

/**
 * Representación pública de un usuario (`Usuario` en `docs/openapi.yaml`).
 *
 * Es la forma exacta que consumen `authStore`, `empleadoStore` y el `usuario`
 * anidado de cada pedido:
 * `{ id, nombre, email, rol, activo }`.
 *
 * `password_hash` no existe como propiedad del DTO y además está `@Exclude()`
 * en la entity: el hash no puede llegar al JSON ni por error (constitución §8).
 * Nunca se serializa una entity directamente.
 */
export class UsuarioResponseDto {
  @ApiProperty({
    description: 'Identificador del usuario',
    example: 1,
  })
  id!: number;

  @ApiProperty({
    description: 'Nombre completo del usuario',
    example: 'Valentín López',
    maxLength: 100,
  })
  nombre!: string;

  @ApiProperty({
    description: 'Email único del usuario, en minúsculas',
    example: 'valentin@cafecito.com',
    maxLength: 150,
  })
  email!: string;

  @ApiProperty({
    description: 'Rol del usuario dentro del sistema',
    enum: [...ROLES],
    example: 'mozo',
  })
  rol!: Rol;

  @ApiProperty({
    description: 'Indica si el usuario puede iniciar sesión',
    example: true,
  })
  activo!: boolean;

  static fromEntity(usuario: Usuario): UsuarioResponseDto {
    const dto = new UsuarioResponseDto();
    dto.id = usuario.id;
    dto.nombre = usuario.nombre;
    dto.email = usuario.email;
    dto.rol = usuario.rol;
    dto.activo = usuario.activo;
    return dto;
  }
}
