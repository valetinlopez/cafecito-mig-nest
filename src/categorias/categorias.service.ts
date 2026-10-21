import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CategoriaResponseDto } from './dto/categoria-response.dto.js';
import { Categoria } from './entities/categoria.entity.js';

@Injectable()
export class CategoriasService {
  constructor(
    @InjectRepository(Categoria)
    private readonly categoriasRepository: Repository<Categoria>,
  ) {}

  /**
   * Devuelve todas las categorías ordenadas alfabéticamente por nombre
   * (equivalente a `getAllCategorias()` del backend FastAPI, CFB-121).
   *
   * El orden se resuelve en la base (`ORDER BY nombre ASC`), no en memoria,
   * para que el resultado sea estable con cualquier volumen de datos.
   */
  async getAllCategorias(): Promise<CategoriaResponseDto[]> {
    const categorias = await this.categoriasRepository.find({
      order: { nombre: 'ASC' },
    });

    return categorias.map((categoria) =>
      CategoriaResponseDto.fromEntity(categoria),
    );
  }
}
