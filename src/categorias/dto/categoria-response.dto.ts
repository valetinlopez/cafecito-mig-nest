import { ApiProperty } from '@nestjs/swagger';
import type { Categoria } from '../entities/categoria.entity.js';

/**
 * Representación pública de una categoría (`Categoria` en `docs/openapi.yaml`).
 *
 * Es la forma exacta que consume `productoStore.cargarCategorias()` del
 * frontend: `{ id: number; nombre: string }[]`. Nunca se serializa la entity
 * directamente, para no filtrar columnas internas al contrato.
 */
export class CategoriaResponseDto {
  @ApiProperty({
    description: 'Identificador de la categoría',
    example: 1,
  })
  id!: number;

  @ApiProperty({
    description: 'Nombre único de la categoría',
    example: 'Bebidas',
    maxLength: 50,
  })
  nombre!: string;

  static fromEntity(categoria: Categoria): CategoriaResponseDto {
    const dto = new CategoriaResponseDto();
    dto.id = categoria.id;
    dto.nombre = categoria.nombre;
    return dto;
  }
}
