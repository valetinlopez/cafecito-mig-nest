import { ApiProperty } from '@nestjs/swagger';
import { toIsoUtc } from '../../common/time/utc-date.js';
import { METODOS_PAGO } from '../../pagos/metodo-pago.js';
import type { MetodoPago } from '../../pagos/metodo-pago.js';

export interface MovimientoCajaProjection {
  id: number;
  fecha: Date;
  pedido_id: number;
  mesa_numero: number;
  monto: number | string;
  metodo_pago: MetodoPago;
  usuario_nombre: string | null;
}

export class MovimientoCajaResponseDto {
  @ApiProperty({ example: 5 })
  id!: number;

  @ApiProperty({ example: '2026-10-19T16:45:00.000Z' })
  fecha!: string;

  @ApiProperty({ example: 12 })
  pedido_id!: number;

  @ApiProperty({ example: 4 })
  mesa_numero!: number;

  @ApiProperty({ example: 950.0, type: Number })
  monto!: number;

  @ApiProperty({ enum: [...METODOS_PAGO], example: 'efectivo' })
  metodo_pago!: MetodoPago;

  @ApiProperty({ example: 'Valentín', nullable: true })
  usuario_nombre!: string | null;

  static fromProjection(
    projection: MovimientoCajaProjection,
  ): MovimientoCajaResponseDto {
    const dto = new MovimientoCajaResponseDto();
    dto.id = projection.id;
    dto.fecha = toIsoUtc(projection.fecha);
    dto.pedido_id = projection.pedido_id;
    dto.mesa_numero = projection.mesa_numero;
    dto.monto = Number(projection.monto);
    dto.metodo_pago = projection.metodo_pago;
    dto.usuario_nombre = projection.usuario_nombre;
    return dto;
  }
}
