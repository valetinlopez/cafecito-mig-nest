import { ApiProperty } from '@nestjs/swagger';

/**
 * Respuesta de las acciones sin recurso (`MessageResponse` en el contrato):
 * `change-password` y `reset-password`.
 *
 * Es un shape de **éxito** distinto del envelope de error `{ detail }`
 * (D-02 del contrato); no deben confundirse.
 */
export class MessageResponseDto {
  @ApiProperty({
    description: 'Mensaje de confirmación en español',
    example: 'Contraseña actualizada correctamente',
  })
  message!: string;

  static fromMessage(message: string): MessageResponseDto {
    const dto = new MessageResponseDto();
    dto.message = message;
    return dto;
  }
}
