import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Mock } from 'vitest';
import { CategoriasService } from './categorias.service.js';
import { CategoriaResponseDto } from './dto/categoria-response.dto.js';
import { Categoria } from './entities/categoria.entity.js';

describe('CategoriasService', () => {
  let service: CategoriasService;
  let find: Mock<() => Promise<Categoria[]>>;

  beforeEach(async () => {
    find = vi.fn<() => Promise<Categoria[]>>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriasService,
        {
          provide: getRepositoryToken(Categoria),
          useValue: { find },
        },
      ],
    }).compile();

    service = module.get(CategoriasService);
  });

  it('devuelve las categorías ordenadas por nombre', async () => {
    find.mockResolvedValue([
      { id: 1, nombre: 'Bebidas' },
      { id: 2, nombre: 'Comida' },
      { id: 3, nombre: 'Postres' },
    ]);

    const categorias = await service.getAllCategorias();

    expect(find).toHaveBeenCalledTimes(1);
    expect(find).toHaveBeenCalledWith({ order: { nombre: 'ASC' } });
    expect(categorias).toHaveLength(3);
    expect(categorias.map((categoria) => categoria.nombre)).toEqual([
      'Bebidas',
      'Comida',
      'Postres',
    ]);
    expect(categorias[0]).toBeInstanceOf(CategoriaResponseDto);
    expect(categorias[0]).toEqual({ id: 1, nombre: 'Bebidas' });
  });

  it('devuelve un array vacío cuando no hay categorías', async () => {
    find.mockResolvedValue([]);

    const categorias = await service.getAllCategorias();

    expect(find).toHaveBeenCalledTimes(1);
    expect(categorias).toEqual([]);
  });
});
