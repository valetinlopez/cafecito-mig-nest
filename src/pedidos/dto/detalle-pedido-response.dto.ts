import { ApiProperty } from '@nestjs/swagger';
import type { DetallePedido } from '../entities/detalle-pedido.entity.js';

/**
 * Ítem de un pedido en la respuesta (`DetallePedido` del contrato).
 *
 * Expone `producto_id` —no el producto anidado— porque el front ya tiene el
 * catálogo y el contrato de `Pedido` solo necesita el vínculo. El `subtotal` es
 * el valor histórico persistido: no se recalcula al serializar.
 */
export class DetallePedidoResponseDto {
  @ApiProperty({
    description: 'Identificador del detalle',
    example: 1,
  })
  id!: number;

  @ApiProperty({
    description: 'Producto vendido',
    example: 1,
  })
  producto_id!: number;

  @ApiProperty({
    description: 'Unidades vendidas',
    example: 2,
  })
  cantidad!: number;

  @ApiProperty({
    description:
      'Precio histórico del producto por la cantidad; número JSON con 2 decimales',
    example: 300.0,
    type: Number,
  })
  subtotal!: number;

  static fromEntity(detalle: DetallePedido): DetallePedidoResponseDto {
    const dto = new DetallePedidoResponseDto();
    dto.id = detalle.id;
    dto.producto_id = detalle.productoId;
    dto.cantidad = detalle.cantidad;
    // Garantía de contrato: aunque el transformer de la columna cambie, el JSON
    // nunca expone un string (D-05, ADR 0004).
    dto.subtotal = Number(detalle.subtotal);
    return dto;
  }
}
