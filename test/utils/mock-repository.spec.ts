import type { SelectQueryBuilder } from 'typeorm';
import { Categoria } from '../../src/categorias/entities/categoria.entity.js';
import { createMockQueryBuilder } from './mock-query-builder.js';
import { createMockRepository } from './mock-repository.js';

const BEBIDAS: Categoria = { id: 1, nombre: 'Bebidas' };

describe('createMockRepository', () => {
  it('mockea las operaciones de lectura con el tipo de la entity', async () => {
    const repository = createMockRepository<Categoria>();

    repository.find.mockResolvedValue([BEBIDAS]);

    await expect(
      repository.find({ order: { nombre: 'ASC' } }),
    ).resolves.toEqual([BEBIDAS]);
    expect(repository.find).toHaveBeenCalledWith({ order: { nombre: 'ASC' } });
  });

  it('mockea create y save para los módulos de escritura', async () => {
    const repository = createMockRepository<Categoria>();
    const postres: Categoria = { id: 2, nombre: 'Postres' };

    repository.create.mockReturnValue(postres);
    repository.save.mockResolvedValue(postres);

    const creada = repository.create({ nombre: 'Postres' });

    await expect(repository.save(creada)).resolves.toBe(postres);
    expect(repository.create).toHaveBeenCalledWith({ nombre: 'Postres' });
    expect(repository.save).toHaveBeenCalledWith(postres);
  });

  it('asocia un query builder y permite verificar el lock pesimista', async () => {
    const repository = createMockRepository<Categoria>();
    const { queryBuilder } = repository;

    queryBuilder.getOne.mockResolvedValue(BEBIDAS);

    const builder: SelectQueryBuilder<Categoria> =
      repository.createQueryBuilder('categoria');

    builder.where('categoria.id = :id', { id: 1 }).setLock('pessimistic_write');

    await expect(builder.getOne()).resolves.toBe(BEBIDAS);
    expect(repository.createQueryBuilder).toHaveBeenCalledWith('categoria');
    expect(queryBuilder.where).toHaveBeenCalledWith('categoria.id = :id', {
      id: 1,
    });
    expect(queryBuilder.setLock).toHaveBeenCalledWith('pessimistic_write');
  });

  it('acepta un query builder preconfigurado', async () => {
    const queryBuilder = createMockQueryBuilder<Categoria>();
    queryBuilder.getOne.mockResolvedValue(BEBIDAS);
    const repository = createMockRepository<Categoria>(queryBuilder);

    await expect(repository.createQueryBuilder().getOne()).resolves.toBe(
      BEBIDAS,
    );
    expect(queryBuilder.getOne).toHaveBeenCalledOnce();
  });
});
