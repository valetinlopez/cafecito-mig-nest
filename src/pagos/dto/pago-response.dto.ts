import { ApiProperty } from '@nestjs/swagger';
import { toIsoUtc } from '../../common/time/utc-date.js';
import type { Pago } from '../entities/pago.entity.js';
import { METODOS_PAGO } from '../metodo-pago.js';
import type { MetodoPago } from '../metodo-pago.js';

/**
 * Representación pública de un pago (`PagoResponseDto`, MIG-31).
 *
 * Es el shape exacto que declara el ticket: `id`, `pedido_id`, `metodo_pago`,
 * `monto` y `fecha`. No expone `caja_id` ni `usuario_id`: son claves internas
 * del cobro y el contrato de movimientos las resuelve como `mesa_numero` y
 * `usuario_nombre` (ver `CONTRACT.md` §3).
 *
 * `monto` sale como **number** (D-05) y `fecha` como ISO-8601 UTC con `Z`
 * (D-06). Nunca se serializa la entity directamente (constitución §8).
 */
export class PagoResponseDto {
  @ApiProperty({
    description: 'Identificador del pago',
    example: 5,
  })
  id!: number;

  @ApiProperty({
    description: 'Pedido cobrado; un pedido tiene como máximo un pago',
    example: 12,
  })
  pedido_id!: number;

  @ApiProperty({
    description: 'Método con el que se cobró el pedido',
    enum: [...METODOS_PAGO],
    example: 'efectivo',
  })
  metodo_pago!: MetodoPago;

  @ApiProperty({
    description:
      'Monto cobrado; siempre igual al total del pedido, calculado en el servidor',
    example: 950.0,
    type: Number,
  })
  monto!: number;

  @ApiProperty({
    description: 'Instante del cobro en ISO-8601 UTC',
    example: '2026-10-19T16:45:00.000Z',
  })
  fecha!: string;

  static fromEntity(pago: Pago): PagoResponseDto {
    const dto = new PagoResponseDto();
    dto.id = pago.id;
    dto.pedido_id = pago.pedidoId;
    dto.metodo_pago = pago.metodoPago;
    // Garantía de contrato: aunque el transformer de la columna cambie, el JSON
    // nunca expone un string (D-05).
    dto.monto = Number(pago.monto);
    dto.fecha = toIsoUtc(pago.fecha);
    return dto;
  }
}
