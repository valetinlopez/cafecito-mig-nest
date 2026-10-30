import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CajaModule } from '../caja/caja.module.js';
import { MesasModule } from '../mesas/mesas.module.js';
import { PagosModule } from '../pagos/pagos.module.js';
import { DetallePedido } from './entities/detalle-pedido.entity.js';
import { Pedido } from './entities/pedido.entity.js';
import { PedidosController } from './pedidos.controller.js';
import { PedidosService } from './pedidos.service.js';

/**
 * Módulo de pedidos (MIG-30 entities/DTOs + MIG-33 ciclo funcional).
 *
 * `TypeOrmModule.forFeature([Pedido, DetallePedido])` registra ambas entities
 * en el `DataSource` global (`autoLoadEntities: true`). El módulo importa caja,
 * mesas y pagos para coordinar sus servicios sin dependencias circulares.
 *
 * Las relaciones con `mesas`, `usuarios`, `productos` y `pagos` son metadata
 * de TypeORM; ninguna requiere `forwardRef` (D-08 de `DECISIONS.md`).
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Pedido, DetallePedido]),
    MesasModule,
    CajaModule,
    PagosModule,
  ],
  controllers: [PedidosController],
  providers: [PedidosService],
  exports: [PedidosService],
})
export class PedidosModule {}
