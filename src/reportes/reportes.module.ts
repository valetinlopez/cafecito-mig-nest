import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Caja } from '../caja/entities/caja.entity.js';
import { Pago } from '../pagos/entities/pago.entity.js';
import { DetallePedido } from '../pedidos/entities/detalle-pedido.entity.js';
import { Pedido } from '../pedidos/entities/pedido.entity.js';
import { ReportesController } from './reportes.controller.js';
import { ReportesService } from './reportes.service.js';

/**
 * Módulo de reportes (MIG-37).
 *
 * Solo lectura: no tiene entity propia ni escribe. Registra las entities que
 * consulta para que el `DataSource` global resuelva los repositorios, sin
 * importar los módulos de `pagos`, `caja` o `pedidos` (no hay dependencia de
 * servicios, solo de tablas).
 */
@Module({
  imports: [TypeOrmModule.forFeature([Pago, Pedido, DetallePedido, Caja])],
  controllers: [ReportesController],
  providers: [ReportesService],
})
export class ReportesModule {}
