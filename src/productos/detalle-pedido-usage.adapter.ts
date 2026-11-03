import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { DetallePedido } from '../pedidos/entities/detalle-pedido.entity.js';
import type { ProductUsagePort } from './product-usage.port.js';

/** Consulta detalles de pedido sin importar PedidosModule ni introducir un ciclo de DI. */
@Injectable()
export class DetallePedidoUsageAdapter implements ProductUsagePort {
  constructor(
    @InjectRepository(DetallePedido)
    private readonly detallesRepository: Repository<DetallePedido>,
  ) {}

  async isProductInAnyOrder(productoId: number): Promise<boolean> {
    const detalle = await this.detallesRepository.findOne({
      select: { id: true },
      where: { productoId },
    });

    return detalle !== null;
  }
}
