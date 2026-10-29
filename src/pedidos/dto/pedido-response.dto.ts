import { ApiProperty } from '@nestjs/swagger';
import { toIsoUtc } from '../../common/time/utc-date.js';
import { MesaResponseDto } from '../../mesas/dto/mesa-response.dto.js';
import { UsuarioResponseDto } from '../../users/dto/usuario-response.dto.js';
import type { Pedido } from '../entities/pedido.entity.js';
import { PEDIDO_ESTADOS } from '../pedido-estado.js';
import type { PedidoEstado } from '../pedido-estado.js';
import { DetallePedidoResponseDto } from './detalle-pedido-response.dto.js';

/**
 * Representación pública de un pedido (`Pedido` del contrato,
 * `docs/api-contract.md` §7).
 *
 * Es el shape exacto que consumen `pedidoStore`, `carritoStore` y el dashboard:
 * `id`, `estado`, `total`, `fecha`, `mesa`, `usuario` y `detalles` anidados. No
 * expone las claves internas (`mesa_id`, `usuario_id`, `pedido_id`) ni las
 * entities crudas: las relaciones se serializan con sus propios DTOs
 * (constitución §8).
 *
 * `total` y `subtotal` salen como **number** (D-05) y `fecha` como ISO-8601 UTC
 * con `Z` (D-06). El factory exige las relaciones hidratadas: si faltan, falla
 * explícito en lugar de emitir un pedido incompleto que rompería el front.
 */
export class PedidoResponseDto {
  @ApiProperty({
    description: 'Identificador del pedido',
    example: 10,
  })
  id!: number;

  @ApiProperty({
    description: 'Estado actual del pedido',
    enum: PEDIDO_ESTADOS,
    example: 'pendiente',
  })
  estado!: PedidoEstado;

  @ApiProperty({
    description: 'Suma de los subtotales; número JSON con 2 decimales',
    example: 300.0,
    type: Number,
  })
  total!: number;

  @ApiProperty({
    description: 'Instante de creación en ISO-8601 UTC',
    example: '2026-10-19T20:24:10.000Z',
  })
  fecha!: string;

  @ApiProperty({
    description: 'Mesa del pedido',
    type: MesaResponseDto,
  })
  mesa!: MesaResponseDto;

  @ApiProperty({
    description: 'Usuario que tomó el pedido',
    type: UsuarioResponseDto,
  })
  usuario!: UsuarioResponseDto;

  @ApiProperty({
    description: 'Ítems de la comanda, en el orden en que se crearon',
    type: [DetallePedidoResponseDto],
  })
  detalles!: DetallePedidoResponseDto[];

  static fromEntity(pedido: Pedido): PedidoResponseDto {
    const dto = new PedidoResponseDto();
    dto.id = pedido.id;
    dto.estado = pedido.estado;
    dto.total = Number(pedido.total);
    dto.fecha = toIsoUtc(pedido.fecha);

    const mesa = pedido.mesa;
    const usuario = pedido.usuario;
    const detalles = pedido.detalles;

    if (mesa === undefined) {
      throw new Error('Pedido sin mesa hidratada');
    }

    if (usuario === undefined) {
      throw new Error('Pedido sin usuario hidratado');
    }

    if (detalles === undefined) {
      throw new Error('Pedido sin detalles hidratados');
    }

    dto.mesa = MesaResponseDto.fromEntity(mesa);
    dto.usuario = UsuarioResponseDto.fromEntity(usuario);
    dto.detalles = detalles.map((detalle) =>
      DetallePedidoResponseDto.fromEntity(detalle),
    );

    return dto;
  }
}
