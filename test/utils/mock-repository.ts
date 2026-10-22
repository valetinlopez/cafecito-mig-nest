import type { ObjectLiteral, Repository, SelectQueryBuilder } from 'typeorm';
import type { Mock } from 'vitest';
import {
  asSelectQueryBuilder,
  createMockQueryBuilder,
  type MockQueryBuilder,
} from './mock-query-builder.js';

/**
 * Contrato mínimo de un `Repository<T>` mockeado.
 *
 * Los métodos se tipan contra `Repository<T>` para que `mockResolvedValue()`
 * exija el tipo real de la entity y no `unknown`. Solo se incluyen las
 * operaciones que usan los services del proyecto; si aparece una nueva, se
 * agrega acá y no se improvisa un mock local en el spec.
 */
export interface MockRepository<T extends ObjectLiteral> {
  find: Mock<Repository<T>['find']>;
  findBy: Mock<Repository<T>['findBy']>;
  findAndCount: Mock<Repository<T>['findAndCount']>;
  findOne: Mock<Repository<T>['findOne']>;
  findOneBy: Mock<Repository<T>['findOneBy']>;
  create: Mock<Repository<T>['create']>;
  save: Mock<Repository<T>['save']>;
  update: Mock<Repository<T>['update']>;
  delete: Mock<Repository<T>['delete']>;
  count: Mock<Repository<T>['count']>;
  createQueryBuilder: Mock<(...args: unknown[]) => SelectQueryBuilder<T>>;

  /**
   * Query builder que devuelve `createQueryBuilder()`.
   *
   * Se configura antes de ejecutar el service (`getOne`, `getMany`, `setLock`)
   * y se verifica después con `toHaveBeenCalledWith`.
   */
  queryBuilder: MockQueryBuilder<T>;
}

/**
 * Crea un repositorio falso listo para inyectar con
 * `provideMockRepository()`.
 *
 * ```ts
 * const repository = createMockRepository<Categoria>();
 * repository.find.mockResolvedValue([{ id: 1, nombre: 'Bebidas' }]);
 * ```
 *
 * El QueryBuilder se crea junto con el repositorio y queda accesible en
 * `repository.queryBuilder`. Para los casos que necesitan un builder
 * preconfigurado se puede pasar uno propio.
 */
export function createMockRepository<T extends ObjectLiteral>(
  queryBuilder: MockQueryBuilder<T> = createMockQueryBuilder<T>(),
): MockRepository<T> {
  return {
    queryBuilder,
    find: vi.fn<Repository<T>['find']>(),
    findBy: vi.fn<Repository<T>['findBy']>(),
    findAndCount: vi.fn<Repository<T>['findAndCount']>(),
    findOne: vi.fn<Repository<T>['findOne']>(),
    findOneBy: vi.fn<Repository<T>['findOneBy']>(),
    create: vi.fn<Repository<T>['create']>(),
    save: vi.fn<Repository<T>['save']>(),
    update: vi.fn<Repository<T>['update']>(),
    delete: vi.fn<Repository<T>['delete']>(),
    count: vi.fn<Repository<T>['count']>(),
    createQueryBuilder: vi.fn<(...args: unknown[]) => SelectQueryBuilder<T>>(
      () => asSelectQueryBuilder(queryBuilder),
    ),
  };
}
