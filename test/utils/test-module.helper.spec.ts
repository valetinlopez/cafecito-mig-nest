import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { Categoria } from '../../src/categorias/entities/categoria.entity.js';
import { createMockRepository } from './mock-repository.js';
import {
  createServiceTestModule,
  createTestModule,
  provideMockRepository,
} from './test-module.helper.js';

const BEBIDAS: Categoria = { id: 1, nombre: 'Bebidas' };

@Injectable()
class CategoriasDePruebaService {
  constructor(
    @InjectRepository(Categoria)
    private readonly categoriasRepository: Repository<Categoria>,
  ) {}

  async getAll(): Promise<Categoria[]> {
    return this.categoriasRepository.find();
  }
}

describe('test-module.helper', () => {
  it('inyecta el repositorio mockeado en el token de la entity', async () => {
    const repository = createMockRepository<Categoria>();
    const { module, service } = await createServiceTestModule(
      CategoriasDePruebaService,
      [provideMockRepository(Categoria, repository)],
    );

    repository.find.mockResolvedValue([BEBIDAS]);

    await expect(service.getAll()).resolves.toEqual([BEBIDAS]);
    expect(repository.find).toHaveBeenCalledOnce();

    await module.close();
  });

  it('crea un módulo arbitrario con createTestModule', async () => {
    const repository = createMockRepository<Categoria>();
    const module = await createTestModule({
      providers: [
        CategoriasDePruebaService,
        provideMockRepository(Categoria, repository),
      ],
    });

    expect(module.get(CategoriasDePruebaService)).toBeInstanceOf(
      CategoriasDePruebaService,
    );

    await module.close();
  });
});
