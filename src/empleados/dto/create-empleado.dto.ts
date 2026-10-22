import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Alta de personal (`EmpleadoCreate` en el contrato, `POST /api/v1/empleados/`,
 * solo `admin`).
 *
 * No declara `rol` a propósito (CFB-112): el alta desde empleados siempre crea
 * `mozo`. Al no estar decorado, si el cliente envía `rol`, el `ValidationPipe`
 * global lo descarta y nunca llega al service.
 */
export class CreateEmpleadoDto {
  @ApiProperty({
    description: 'Nombre completo del empleado',
    example: 'Valentín López',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  nombre!: string;

  @ApiProperty({
    description: 'Email único del empleado',
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
}
