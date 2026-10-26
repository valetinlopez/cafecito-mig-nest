import { ApiProperty } from '@nestjs/swagger';
import type { Producto } from '../entities/producto.entity.js';
import { CategoriaProductoDto } from './categoria-producto.dto.js';

export class ProductoResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Café con leche' })
  nombre!: string;

  @ApiProperty({ example: 'Café espresso con leche vaporizada', nullable: true })
  descripcion!: string | null;

  @ApiProperty({ example: 850.0, type: Number })
  precio!: number;

  @ApiProperty({ example: 50 })
  stock!: number;

  @ApiProperty({ example: 5 })
  stock_minimo!: number;

  @ApiProperty({ example: true })
  disponible!: boolean;

  @ApiProperty({ type: CategoriaProductoDto })
  categoria!: CategoriaProductoDto;

  static fromEntity(producto: Producto): ProductoResponseDto {
    const dto = new ProductoResponseDto();
    dto.id = producto.id;
    dto.nombre = producto.nombre;
    dto.descripcion = producto.descripcion ?? null;
    dto.precio = Number(producto.precio);
    dto.stock = producto.stock;
    dto.stock_minimo = producto.stockMinimo;
    dto.disponible = producto.disponible;
    const categoria = producto.categoria;
    if (categoria === undefined) {
      throw new Error('Producto sin categoría hidratada');
    }
    dto.categoria = CategoriaProductoDto.fromEntity(categoria);
    return dto;
  }
}