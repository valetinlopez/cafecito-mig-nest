import { ApiProperty } from '@nestjs/swagger';
import type { Mesa } from '../entities/mesa.entity.js';
import { MESA_ESTADOS } from '../mesa-estado.js';
import type { MesaEstado } from '../mesa-estado.js';

export class MesaResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 13 })
  numero!: number;

  @ApiProperty({ enum: MESA_ESTADOS, example: 'libre' })
  estado!: MesaEstado;

  static fromEntity(mesa: Mesa): MesaResponseDto {
    const dto = new MesaResponseDto();
    dto.id = mesa.id;
    dto.numero = mesa.numero;
    dto.estado = mesa.estado;
    return dto;
  }
}
