import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';
import { MESA_ESTADOS } from '../mesa-estado.js';
import type { MesaEstado } from '../mesa-estado.js';

export class UpdateMesaDto {
  @ApiProperty({ enum: MESA_ESTADOS, example: 'ocupada' })
  @IsString()
  @IsIn(MESA_ESTADOS)
  estado!: MesaEstado;
}
