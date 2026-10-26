import type { TestingModule } from '@nestjs/testing';
import { In } from 'typeorm';
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

  it('busca una categoría por id', async () => {
    const categoria = { id: 4, nombre: 'Postres' };
    repository.findOneBy.mockResolvedValue(categoria);

    await expect(service.findById(4)).resolves.toBe(categoria);
    expect(repository.findOneBy).toHaveBeenCalledWith({ id: 4 });
  });

  it('busca varias categorías en una consulta y evita query para lista vacía', async () => {
    const categorias = [
      { id: 1, nombre: 'Bebidas' },
      { id: 2, nombre: 'Comida' },
    ];
    repository.find.mockResolvedValue(categorias);

    await expect(service.findManyByIds([1, 2])).resolves.toEqual(categorias);
    expect(repository.find).toHaveBeenCalledWith({
      where: { id: In([1, 2]) },
    });

    repository.find.mockClear();
    await expect(service.findManyByIds([])).resolves.toEqual([]);
    expect(repository.find).not.toHaveBeenCalled();
  });

  it('devuelve null si la categoría por id no existe', async () => {
    repository.findOneBy.mockResolvedValue(null);

    await expect(service.findById(404)).resolves.toBeNull();
  });
});
