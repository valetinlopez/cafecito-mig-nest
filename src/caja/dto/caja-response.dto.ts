import { ApiProperty } from '@nestjs/swagger';
import { toIsoUtc, toIsoUtcOrNull } from '../../common/time/utc-date.js';
import type { Caja } from '../entities/caja.entity.js';
import { CAJA_ESTADOS } from '../estado-caja.js';
import type { CajaEstado } from '../estado-caja.js';

export class CajaResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: '2026-10-19T11:00:00.000Z' })
  fecha_apertura!: string;

  @ApiProperty({ example: null, nullable: true })
  fecha_cierre!: string | null;

  @ApiProperty({ example: 1000.0, type: Number })
  monto_inicial!: number;

  @ApiProperty({ example: null, nullable: true, type: Number })
  monto_final!: number | null;

  @ApiProperty({ enum: [...CAJA_ESTADOS], example: 'abierta' })
  estado!: CajaEstado;

  @ApiProperty({ example: 2500.0, type: Number })
  total_ventas!: number;

  static fromEntity(
    caja: Caja,
    totalVentas: number | string | null,
  ): CajaResponseDto {
    const dto = new CajaResponseDto();
    dto.id = caja.id;
    dto.fecha_apertura = toIsoUtc(caja.fechaApertura);
    dto.fecha_cierre = toIsoUtcOrNull(caja.fechaCierre);
    dto.monto_inicial = Number(caja.montoInicial);
    dto.monto_final = caja.montoFinal === null ? null : Number(caja.montoFinal);
    dto.estado = caja.estado;
    dto.total_ventas = Number(totalVentas ?? 0);
    return dto;
  }
}
