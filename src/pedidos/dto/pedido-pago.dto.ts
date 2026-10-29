import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { METODOS_PAGO } from '../../pagos/metodo-pago.js';
import type { MetodoPago } from '../../pagos/metodo-pago.js';

/**
 * Request `POST /api/v1/pedidos/{id}/pago` (`PedidoPagoRequest` del contrato).
 *
 * **Sin `monto`:** el cobro es siempre por el total del pedido y lo calcula el
 * servidor. Aceptar un monto del cliente permitiría alterar la caja (D-03 de
 * `src/pagos/DECISIONS.md`).
 *
 * `METODOS_PAGO` es la única fuente del enum: no se repiten literales entre
 * `pedidos` y `pagos`.
 */
export class PedidoPagoDto {
  @ApiProperty({
    description: 'Método con el que se cobra el pedido',
    enum: METODOS_PAGO,
    example: 'efectivo',
  })
  @IsIn(METODOS_PAGO)
  metodo_pago!: MetodoPago;
}
