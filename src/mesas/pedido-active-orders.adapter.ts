import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In } from 'typeorm';
import type { Repository } from 'typeorm';
import { Pedido } from '../pedidos/entities/pedido.entity.js';
import { ACTIVE_PEDIDO_ESTADOS } from '../pedidos/pedido-estado.js';
import type { ActiveOrdersPort } from './active-orders.port.js';

/** Consulta pedidos sin importar PedidosModule ni introducir un ciclo de DI. */
@Injectable()
export class PedidoActiveOrdersAdapter implements ActiveOrdersPort {
  constructor(
    @InjectRepository(Pedido)
    private readonly pedidosRepository: Repository<Pedido>,
  ) {}

  async hasUnpaidActiveOrderForTable(mesaId: number): Promise<boolean> {
    const pedido = await this.pedidosRepository.findOne({
      select: { id: true },
      where: { mesaId, estado: In(ACTIVE_PEDIDO_ESTADOS) },
    });

    return pedido !== null;
  }
}
