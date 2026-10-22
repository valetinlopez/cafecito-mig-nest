import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

/**
 * Cambio de contraseña autenticado (`ChangePasswordRequest` en el contrato,
 * `POST /api/v1/auth/change-password`).
 *
 * `password_actual` solo valida tipo: puede ser una clave corta heredada del
 * legacy. La política de mínimo 6 se aplica únicamente a la contraseña nueva.
 */
export class ChangePasswordDto {
  @ApiProperty({
    description: 'Contraseña actual del usuario',
    example: 'secreto123',
    format: 'password',
  })
  @IsString()
  password_actual!: string;

  @ApiProperty({
    description: 'Contraseña nueva (mínimo 6 caracteres)',
    example: 'nuevoSecreto456',
    minLength: 6,
    format: 'password',
  })
  @IsString()
  @MinLength(6)
  password_nueva!: string;
}
