import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriasController } from './categorias.controller.js';
import { CategoriasService } from './categorias.service.js';
import { Categoria } from './entities/categoria.entity.js';

/**
 * Módulo de referencia (MIG-18).
 *
 * Se registra en `src/app.module.ts` desde MIG-19: `DatabaseModule` publica el
 * `DataSource` global que `TypeOrmModule.forFeature()` necesita para resolver
 * `Repository<Categoria>`.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Categoria])],
  controllers: [CategoriasController],
  providers: [CategoriasService],
  exports: [CategoriasService],
})
export class CategoriasModule {}
