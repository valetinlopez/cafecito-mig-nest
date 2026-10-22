import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import { ROLES, type Rol } from '../../users/rol.js';

/**
 * Alta administrativa de usuario (`UsuarioCreate` en el contrato,
 * `POST /api/v1/auth/register`, solo `admin`).
 *
 * Equivale al schema `UsuarioCreate` del backend Python. El email se valida con
 * formato y tope de 150 (largo de la columna); la normalización a minúsculas es
 * responsabilidad del service (`users` D-04), no del DTO.
 */
export class RegisterDto {
  @ApiProperty({
    description: 'Nombre completo del usuario',
    example: 'Valentín López',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  nombre!: string;

  @ApiProperty({
    description: 'Email único del usuario',
    example: 'valentin@cafecito.com',
    maxLength: 150,
  })
  @IsEmail()
  @MaxLength(150)
  email!: string;

  @ApiProperty({
    description: 'Contraseña inicial (mínimo 6 caracteres)',
    example: 'secreto123',
    minLength: 6,
    format: 'password',
  })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({
    description: 'Rol asignado al usuario',
    enum: [...ROLES],
    example: 'mozo',
  })
  @IsIn(ROLES)
  rol!: Rol;
}
