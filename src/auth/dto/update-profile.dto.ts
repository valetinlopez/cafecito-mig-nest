import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Edición del perfil propio (`UsuarioUpdateProfile` en el contrato,
 * `PATCH /api/v1/auth/me`).
 *
 * Todos los campos son opcionales: el service aplica solo los presentes. El rol
 * no se puede modificar desde este endpoint y, al no estar declarado, el
 * `ValidationPipe` global lo descarta (`whitelist: true`).
 */
export class UpdateProfileDto {
  @ApiPropertyOptional({
    description: 'Nombre completo del usuario',
    example: 'Valentín López',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nombre?: string;

  @ApiPropertyOptional({
    description: 'Email único del usuario',
    example: 'valentin@cafecito.com',
    maxLength: 150,
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  email?: string;
}
