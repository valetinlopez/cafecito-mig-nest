import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

/**
 * Solicitud de recuperación de contraseña (`ForgotPasswordRequest` en el
 * contrato, `POST /api/v1/auth/forgot-password`, público).
 *
 * El endpoint responde siempre `200` y no revela si el email existe: la
 * validación de formato es lo único que puede devolver `422` (D-15, MIG-25).
 */
export class ForgotPasswordDto {
  @ApiProperty({
    description: 'Email del usuario que quiere recuperar su contraseña',
    example: 'valentin@cafecito.com',
  })
  @IsEmail()
  email!: string;
}
