import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriasModule } from '../categorias/categorias.module.js';
import { ProductosController } from './productos.controller.js';
import { Producto } from './entities/producto.entity.js';
import { ProductosService } from './productos.service.js';

@Module({
	imports: [TypeOrmModule.forFeature([Producto]), CategoriasModule],
	controllers: [ProductosController],
	providers: [ProductosService],
	exports: [ProductosService],
})
export class ProductosModule {}
