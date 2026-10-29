import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pago } from './entities/pago.entity.js';
import { PagosService } from './pagos.service.js';

/**
 * Módulo de soporte de pagos (MIG-31).
 *
 * `TypeOrmModule.forFeature([Pago])` registra la entity en el `DataSource`
 * global (`autoLoadEntities: true`) y deja el repositorio listo para que
 * MIG-32 implemente el cobro. Se exporta `PagosService` —no el repositorio—
 * para que `pedidos` y `caja` dependan del contrato del servicio y no del
 * mapeo de la tabla.
 *
 * No tiene controller: el contrato no define endpoints `/pagos` (D-01).
 */
@Module({
  imports: [TypeOrmModule.forFeature([Pago])],
  providers: [PagosService],
  exports: [PagosService],
})
export class PagosModule {}
