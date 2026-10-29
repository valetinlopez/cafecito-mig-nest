import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ACTIVE_ORDERS_PORT } from './active-orders.port.js';
import { MesasController } from './mesas.controller.js';
import { Mesa } from './entities/mesa.entity.js';
import { MesasService } from './mesas.service.js';

async function unavailableActiveOrdersCheck(): Promise<boolean> {
  await Promise.resolve();
  throw new Error('Active orders provider is not configured');
}

/** Provider temporal fail-closed: se reemplaza al implementar `PedidosService` (MIG-33). */
const unavailableActiveOrdersProvider = {
  provide: ACTIVE_ORDERS_PORT,
  useValue: {
    hasUnpaidActiveOrderForTable: unavailableActiveOrdersCheck,
  },
};

@Module({
  imports: [TypeOrmModule.forFeature([Mesa])],
  controllers: [MesasController],
  providers: [MesasService, unavailableActiveOrdersProvider],
  exports: [MesasService],
})
export class MesasModule {}
