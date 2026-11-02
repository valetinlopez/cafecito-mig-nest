import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Caja } from '../caja/entities/caja.entity.js';
import { Mesa } from '../mesas/entities/mesa.entity.js';
import { Pago } from '../pagos/entities/pago.entity.js';
import { Pedido } from '../pedidos/entities/pedido.entity.js';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';

@Module({
	imports: [TypeOrmModule.forFeature([Pago, Mesa, Pedido, Caja])],
	controllers: [DashboardController],
	providers: [DashboardService],
})
export class DashboardModule {}
