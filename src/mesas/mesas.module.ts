import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ACTIVE_ORDERS_PORT } from './active-orders.port.js';
import { MesasController } from './mesas.controller.js';
import { Mesa } from './entities/mesa.entity.js';
import { PedidoActiveOrdersAdapter } from './pedido-active-orders.adapter.js';
import { Pedido } from '../pedidos/entities/pedido.entity.js';
import { MesasService } from './mesas.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Mesa, Pedido])],
  controllers: [MesasController],
  providers: [
    MesasService,
    PedidoActiveOrdersAdapter,
    { provide: ACTIVE_ORDERS_PORT, useExisting: PedidoActiveOrdersAdapter },
  ],
  exports: [MesasService],
})
export class MesasModule {}
