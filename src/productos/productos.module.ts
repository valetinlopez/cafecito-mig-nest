import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriasModule } from '../categorias/categorias.module.js';
import { DetallePedido } from '../pedidos/entities/detalle-pedido.entity.js';
import { DetallePedidoUsageAdapter } from './detalle-pedido-usage.adapter.js';
import { ProductosController } from './productos.controller.js';
import { Producto } from './entities/producto.entity.js';
import { PRODUCT_USAGE_PORT } from './product-usage.port.js';
import { ProductosService } from './productos.service.js';

@Module({
	imports: [
		TypeOrmModule.forFeature([Producto, DetallePedido]),
		CategoriasModule,
	],
	controllers: [ProductosController],
	providers: [
		ProductosService,
		DetallePedidoUsageAdapter,
		{ provide: PRODUCT_USAGE_PORT, useExisting: DetallePedidoUsageAdapter },
	],
	exports: [ProductosService],
})
export class ProductosModule {}
