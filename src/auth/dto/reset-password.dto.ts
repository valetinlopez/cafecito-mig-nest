import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

/**
 * Restablecimiento con token (`ResetPasswordRequest` en el contrato,
 * `POST /api/v1/auth/reset-password`, público).
 *
 * El token se valida en el service: firma, expiración (15 min) y claim
 * `purpose = password_reset` para que no sea intercambiable con un access token
 * (criterio del epic MIG-4). El DTO solo verifica tipo y formato de la clave.
 */
export class ResetPasswordDto {
  @ApiProperty({
    description: 'Token de reseteo emitido por forgot-password',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  token!: string;

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
