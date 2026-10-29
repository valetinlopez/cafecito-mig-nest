import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PagosModule } from '../pagos/pagos.module.js';
import { CajaController } from './caja.controller.js';
import { Caja } from './entities/caja.entity.js';
import { CajaService } from './caja.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Caja]), PagosModule],
  controllers: [CajaController],
  providers: [CajaService],
  exports: [CajaService],
})
export class CajaModule {}
