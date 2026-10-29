import { createMockDataSource } from './mock-data-source.js';
import type { EntityManager } from 'typeorm';

describe('mock data source', () => {
  it('ejecuta callback transaccional con el manager provisto', async () => {
    const manager = {} as EntityManager;
    const mock = createMockDataSource(manager);
    const callback = vi.fn((current: EntityManager) =>
      Promise.resolve(current),
    );

    await expect(mock.transaction(callback)).resolves.toBe(manager);
    expect(callback).toHaveBeenCalledWith(manager);
  });
});
