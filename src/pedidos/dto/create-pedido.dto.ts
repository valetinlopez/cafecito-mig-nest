import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  Min,
  ValidateNested,
} from 'class-validator';
import { DetallePedidoCreateDto } from './detalle-pedido-create.dto.js';

/**
 * Request `POST /api/v1/pedidos/` (`PedidoCreate` del contrato).
 *
 * `detalles` exige **al menos un ítem**: un pedido sin productos no es una
 * comanda válida. El resto de las reglas (mesa libre, producto disponible,
 * stock suficiente) son de negocio y viven en `PedidosService` (MIG-33); acá
 * solo se valida la forma del contrato.
 */
export class CreatePedidoDto {
  @ApiProperty({
    description: 'Mesa que recibe el pedido',
    example: 1,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  mesa_id!: number;

  @ApiProperty({
    description: 'Ítems de la comanda; mínimo uno',
    type: [DetallePedidoCreateDto],
    minItems: 1,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DetallePedidoCreateDto)
  detalles!: DetallePedidoCreateDto[];
}
