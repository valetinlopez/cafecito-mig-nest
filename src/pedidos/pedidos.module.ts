import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DetallePedido } from './entities/detalle-pedido.entity.js';
import { Pedido } from './entities/pedido.entity.js';

/**
 * Módulo de pedidos (MIG-30: entities y DTOs).
 *
 * `TypeOrmModule.forFeature([Pedido, DetallePedido])` registra ambas entities en
 * el `DataSource` global (`autoLoadEntities: true`) y deja los repositorios
 * listos para que MIG-33 implemente `PedidosService` y `PedidosController`.
 *
 * No hay controller todavía: el contrato de §6.5 se implementa en MIG-33. Las
 * relaciones con `mesas`, `usuarios`, `productos` y `pagos` ya existen, así que
 * TypeORM puede resolverlas sin `forwardRef` (D-08 de `DECISIONS.md`).
 */
@Module({
  imports: [TypeOrmModule.forFeature([Pedido, DetallePedido])],
})
export class PedidosModule {}
