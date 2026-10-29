import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { PEDIDO_ESTADOS } from '../pedido-estado.js';
import type { PedidoEstado } from '../pedido-estado.js';

/**
 * Request `PATCH /api/v1/pedidos/{id}` (`PedidoUpdate` del contrato).
 *
 * Solo valida que el estado pertenezca al enum. Que la transición sea legal
 * (`pendiente → en_preparacion`, etc.) es una regla de negocio del mapa
 * `TRANSICIONES_PEDIDO` que implementa `PedidosService` (MIG-33); `pagado`
 * **no** se alcanza por este endpoint, solo por `POST /pedidos/{id}/pago`.
 */
export class UpdatePedidoDto {
  @ApiProperty({
    description: 'Nuevo estado del pedido',
    enum: PEDIDO_ESTADOS,
    example: 'en_preparacion',
  })
  @IsIn(PEDIDO_ESTADOS)
  estado!: PedidoEstado;
}
