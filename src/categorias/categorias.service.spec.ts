import type { TestingModule } from '@nestjs/testing';
import {
  createMockRepository,
  type MockRepository,
} from '../../test/utils/mock-repository.js';
import {
  createServiceTestModule,
  provideMockRepository,
} from '../../test/utils/test-module.helper.js';
import { CategoriasService } from './categorias.service.js';
import { CategoriaResponseDto } from './dto/categoria-response.dto.js';
import { Categoria } from './entities/categoria.entity.js';

describe('CategoriasService', () => {
  let module: TestingModule;
  let service: CategoriasService;
  let repository: MockRepository<Categoria>;

  beforeEach(async () => {
    repository = createMockRepository<Categoria>();

    ({ module, service } = await createServiceTestModule(CategoriasService, [
      provideMockRepository(Categoria, repository),
    ]));
  });

  afterEach(async () => {
    await module.close();
  });

  it('devuelve las categorías ordenadas por nombre', async () => {
    repository.find.mockResolvedValue([
      { id: 1, nombre: 'Bebidas' },
      { id: 2, nombre: 'Comida' },
      { id: 3, nombre: 'Postres' },
    ]);

    const categorias = await service.getAllCategorias();

    expect(repository.find).toHaveBeenCalledTimes(1);
    expect(repository.find).toHaveBeenCalledWith({ order: { nombre: 'ASC' } });
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
    repository.find.mockResolvedValue([]);

    const categorias = await service.getAllCategorias();

    expect(repository.find).toHaveBeenCalledTimes(1);
    expect(categorias).toEqual([]);
  });
});
