import { ApiProperty } from '@nestjs/swagger';
import { FORGOT_PASSWORD_MESSAGE } from '../auth-messages.js';

/**
 * Respuesta de `POST /api/v1/auth/forgot-password` (`ForgotPasswordResponse`).
 *
 * `reset_token` se completa **solo** en `development` (D-15 del contrato,
 * D-04 de `auth`): no hay servicio de email y en producción sería una vía
 * directa para tomar la cuenta. El front lo tipa como `string | null`.
 */
export class ForgotPasswordResponseDto {
  @ApiProperty({
    description: 'Mensaje genérico; no revela si el email está registrado',
    example: FORGOT_PASSWORD_MESSAGE,
  })
  message!: string;

  @ApiProperty({
    description:
      'Token de reseteo, solo en `development`; `null` en el resto de los entornos',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    nullable: true,
    type: String,
  })
  reset_token!: string | null;

  static fromResetToken(resetToken: string | null): ForgotPasswordResponseDto {
    const dto = new ForgotPasswordResponseDto();
    dto.message = FORGOT_PASSWORD_MESSAGE;
    dto.reset_token = resetToken;
    return dto;
  }
}
