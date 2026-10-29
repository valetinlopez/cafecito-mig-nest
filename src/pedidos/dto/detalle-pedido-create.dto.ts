import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

/**
 * Ítem del request `POST /api/v1/pedidos/` (`DetallePedidoCreate` del
 * contrato).
 *
 * El cliente solo envía el producto y la cantidad: **no** envía precio ni
 * subtotal. El servidor resuelve el precio vigente y calcula el subtotal
 * histórico dentro de la transacción de creación (MIG-33, D-02 de
 * `src/pedidos/DECISIONS.md`).
 */
export class DetallePedidoCreateDto {
  @ApiProperty({
    description: 'Producto que se agrega al pedido',
    example: 1,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  producto_id!: number;

  @ApiProperty({
    description: 'Cantidad de unidades; debe ser al menos 1',
    example: 2,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cantidad!: number;
}
