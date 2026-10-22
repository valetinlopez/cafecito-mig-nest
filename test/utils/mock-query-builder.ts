import type { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import type { Mock } from 'vitest';

/**
 * Firma de un método encadenable del QueryBuilder.
 *
 * Los argumentos quedan como `unknown[]` a propósito: el mock no valida la
 * forma de la query, solo registra la llamada para que el test la verifique con
 * `toHaveBeenCalledWith`.
 */
export type ChainableMethod<T> = Mock<(...args: unknown[]) => T>;

/**
 * Subconjunto tipado de `SelectQueryBuilder<T>` que usan los services del
 * proyecto. Los métodos encadenables devuelven el mismo builder y los
 * terminales (`getOne`, `getMany`, ...) son mocks que el test configura.
 *
 * El objetivo no es replicar todo TypeORM, sino cubrir las queries reales del
 * backend sin conectar a PostgreSQL:
 * `where` / `andWhere` / `leftJoinAndSelect` / `orderBy` / `setLock`.
 */
export interface MockQueryBuilder<T extends ObjectLiteral> {
  select: ChainableMethod<MockQueryBuilder<T>>;
  addSelect: ChainableMethod<MockQueryBuilder<T>>;
  where: ChainableMethod<MockQueryBuilder<T>>;
  andWhere: ChainableMethod<MockQueryBuilder<T>>;
  orWhere: ChainableMethod<MockQueryBuilder<T>>;
  leftJoin: ChainableMethod<MockQueryBuilder<T>>;
  leftJoinAndSelect: ChainableMethod<MockQueryBuilder<T>>;
  innerJoin: ChainableMethod<MockQueryBuilder<T>>;
  innerJoinAndSelect: ChainableMethod<MockQueryBuilder<T>>;
  orderBy: ChainableMethod<MockQueryBuilder<T>>;
  addOrderBy: ChainableMethod<MockQueryBuilder<T>>;
  groupBy: ChainableMethod<MockQueryBuilder<T>>;
  having: ChainableMethod<MockQueryBuilder<T>>;
  setParameter: ChainableMethod<MockQueryBuilder<T>>;
  setParameters: ChainableMethod<MockQueryBuilder<T>>;
  setLock: ChainableMethod<MockQueryBuilder<T>>;
  take: ChainableMethod<MockQueryBuilder<T>>;
  skip: ChainableMethod<MockQueryBuilder<T>>;
  limit: ChainableMethod<MockQueryBuilder<T>>;
  offset: ChainableMethod<MockQueryBuilder<T>>;
  getOne: Mock<() => Promise<T | null>>;
  getMany: Mock<() => Promise<T[]>>;
  getManyAndCount: Mock<() => Promise<[T[], number]>>;
  getCount: Mock<() => Promise<number>>;
}

/**
 * Crea un `SelectQueryBuilder<T>` falso, encadenable y verificable.
 *
 * Cada test debe crear el suyo en `beforeEach`: así los resultados y las
 * llamadas no se filtran entre casos.
 *
 * ```ts
 * const queryBuilder = createMockQueryBuilder<Mesa>();
 * queryBuilder.getOne.mockResolvedValue(mesa);
 * ```
 */
export function createMockQueryBuilder<
  T extends ObjectLiteral,
>(): MockQueryBuilder<T> {
  const queryBuilder = {} as MockQueryBuilder<T>;

  const chainable = (): ChainableMethod<MockQueryBuilder<T>> =>
    vi.fn<(...args: unknown[]) => MockQueryBuilder<T>>(() => queryBuilder);

  queryBuilder.select = chainable();
  queryBuilder.addSelect = chainable();
  queryBuilder.where = chainable();
  queryBuilder.andWhere = chainable();
  queryBuilder.orWhere = chainable();
  queryBuilder.leftJoin = chainable();
  queryBuilder.leftJoinAndSelect = chainable();
  queryBuilder.innerJoin = chainable();
  queryBuilder.innerJoinAndSelect = chainable();
  queryBuilder.orderBy = chainable();
  queryBuilder.addOrderBy = chainable();
  queryBuilder.groupBy = chainable();
  queryBuilder.having = chainable();
  queryBuilder.setParameter = chainable();
  queryBuilder.setParameters = chainable();
  queryBuilder.setLock = chainable();
  queryBuilder.take = chainable();
  queryBuilder.skip = chainable();
  queryBuilder.limit = chainable();
  queryBuilder.offset = chainable();

  queryBuilder.getOne = vi.fn<() => Promise<T | null>>();
  queryBuilder.getMany = vi.fn<() => Promise<T[]>>();
  queryBuilder.getManyAndCount = vi.fn<() => Promise<[T[], number]>>();
  queryBuilder.getCount = vi.fn<() => Promise<number>>();

  return queryBuilder;
}

/**
 * Adapta el mock al tipo que declara `Repository.createQueryBuilder()`.
 * El cast vive en un solo lugar: el resto de los tests trabaja con tipos
 * reales de TypeORM y no necesita `as unknown as`.
 */
export function asSelectQueryBuilder<T extends ObjectLiteral>(
  queryBuilder: MockQueryBuilder<T>,
): SelectQueryBuilder<T> {
  return queryBuilder as unknown as SelectQueryBuilder<T>;
}
