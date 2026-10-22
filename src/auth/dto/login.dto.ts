import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

/**
 * Credenciales de `POST /api/v1/auth/login` (`LoginRequest` en el contrato).
 *
 * No se valida longitud de `password`: el login debe aceptar exactamente lo que
 * el usuario tenga guardado (usuarios migrados del legacy incluidos). El mínimo
 * de 6 se aplica solo al crear o cambiar una contraseña.
 */
export class LoginDto {
  @ApiProperty({
    description: 'Email con el que se registró el usuario',
    example: 'admin@cafecito.com',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'Contraseña del usuario',
    example: 'secreto123',
    format: 'password',
  })
  @IsString()
  password!: string;
}
