import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * Edición de personal (`EmpleadoUpdate` en el contrato,
 * `PATCH /api/v1/empleados/{id}`, solo `admin`).
 *
 * Solo permite `nombre`, `email` y `activo`. El rol no se puede cambiar desde
 * empleados (CFB-112): no está declarado, así que un `rol` enviado por el
 * cliente se descarta en el `ValidationPipe` global.
 *
 * La baja es lógica (`activo = false`); no existe borrado físico (`users` D-05).
 */
export class UpdateEmpleadoDto {
  @ApiPropertyOptional({
    description: 'Nombre completo del empleado',
    example: 'Valentín López',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nombre?: string;

  @ApiPropertyOptional({
    description: 'Email único del empleado',
    example: 'valentin@cafecito.com',
    maxLength: 150,
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  email?: string;

  @ApiPropertyOptional({
    description: 'Estado del empleado; `false` es baja lógica',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
