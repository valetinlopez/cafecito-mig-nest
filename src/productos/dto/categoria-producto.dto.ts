import { ApiProperty } from '@nestjs/swagger';
import type { Categoria } from '../../categorias/entities/categoria.entity.js';

export class CategoriaProductoDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Bebidas' })
  nombre!: string;

  static fromEntity(categoria: Categoria): CategoriaProductoDto {
    const dto = new CategoriaProductoDto();
    dto.id = categoria.id;
    dto.nombre = categoria.nombre;
    return dto;
  }
}