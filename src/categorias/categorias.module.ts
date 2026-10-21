import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriasController } from './categorias.controller.js';
import { CategoriasService } from './categorias.service.js';
import { Categoria } from './entities/categoria.entity.js';

/**
 * Módulo de referencia (MIG-18).
 *
 * Requiere que `AppModule` registre `TypeOrmModule.forRoot()` (MIG-19): sin un
 * `DataSource` global, `TypeOrmModule.forFeature()` no puede resolver
 * `Repository<Categoria>` y la aplicación no arranca. Por eso la activación en
 * `app.module.ts` queda documentada en `docs/conventions.md` §11.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Categoria])],
  controllers: [CategoriasController],
  providers: [CategoriasService],
  exports: [CategoriasService],
})
export class CategoriasModule {}
