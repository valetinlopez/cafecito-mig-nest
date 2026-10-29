import type { DataSource, EntityManager } from 'typeorm';
import type { Mock } from 'vitest';

export interface MockDataSource {
  transaction: Mock<
    <T>(runInTransaction: (manager: EntityManager) => Promise<T>) => Promise<T>
  >;
}

export function createMockDataSource(manager: EntityManager): MockDataSource {
  return {
    transaction: vi.fn(
      <T>(
        runInTransaction: (transactionManager: EntityManager) => Promise<T>,
      ): Promise<T> => Promise.resolve().then(() => runInTransaction(manager)),
    ),
  };
}

export function asDataSource(mock: MockDataSource): DataSource {
  return mock as unknown as DataSource;
}
