import { Categoria } from '../../src/categorias/entities/categoria.entity.js';
import { createMockQueryBuilder } from './mock-query-builder.js';

const BEBIDAS: Categoria = { id: 1, nombre: 'Bebidas' };

describe('createMockQueryBuilder', () => {
  it('encadena los métodos y devuelve el mismo builder', () => {
    const queryBuilder = createMockQueryBuilder<Categoria>();

    const result = queryBuilder
      .where('categoria.id = :id', { id: 1 })
      .andWhere('categoria.nombre ILIKE :nombre', { nombre: '%bebida%' })
      .leftJoinAndSelect('categoria.productos', 'producto')
      .orderBy('categoria.nombre', 'ASC')
      .take(10);

    expect(result).toBe(queryBuilder);
    expect(queryBuilder.where).toHaveBeenCalledWith('categoria.id = :id', {
      id: 1,
    });
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'categoria.nombre ILIKE :nombre',
      { nombre: '%bebida%' },
    );
    expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
      'categoria.productos',
      'producto',
    );
    expect(queryBuilder.orderBy).toHaveBeenCalledWith(
      'categoria.nombre',
      'ASC',
    );
    expect(queryBuilder.take).toHaveBeenCalledWith(10);
  });

  it('permite mockear y verificar un lock pesimista', () => {
    const queryBuilder = createMockQueryBuilder<Categoria>();

    const result = queryBuilder.setLock('pessimistic_write');

    expect(result).toBe(queryBuilder);
    expect(queryBuilder.setLock).toHaveBeenCalledWith('pessimistic_write');
    expect(queryBuilder.setLock).toHaveBeenCalledOnce();
  });

  it('devuelve los resultados configurados en los métodos terminales', async () => {
    const queryBuilder = createMockQueryBuilder<Categoria>();

    queryBuilder.getOne.mockResolvedValue(BEBIDAS);
    queryBuilder.getMany.mockResolvedValue([BEBIDAS]);
    queryBuilder.getManyAndCount.mockResolvedValue([[BEBIDAS], 1]);
    queryBuilder.getCount.mockResolvedValue(1);

    await expect(queryBuilder.getOne()).resolves.toBe(BEBIDAS);
    await expect(queryBuilder.getMany()).resolves.toEqual([BEBIDAS]);
    await expect(queryBuilder.getManyAndCount()).resolves.toEqual([
      [BEBIDAS],
      1,
    ]);
    await expect(queryBuilder.getCount()).resolves.toBe(1);
  });
});
