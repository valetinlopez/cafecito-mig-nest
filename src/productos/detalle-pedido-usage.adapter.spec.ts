import type { TestingModule } from '@nestjs/testing';
import {
  createMockRepository,
  type MockRepository,
} from '../../test/utils/mock-repository.js';
import {
  createServiceTestModule,
  provideMockRepository,
} from '../../test/utils/test-module.helper.js';
import { DetallePedido } from '../pedidos/entities/detalle-pedido.entity.js';
import { DetallePedidoUsageAdapter } from './detalle-pedido-usage.adapter.js';

describe('DetallePedidoUsageAdapter', () => {
  let module: TestingModule;
  let adapter: DetallePedidoUsageAdapter;
  let detallesRepository: MockRepository<DetallePedido>;

  beforeEach(async () => {
    detallesRepository = createMockRepository<DetallePedido>();
    ({ module, service: adapter } = await createServiceTestModule(
      DetallePedidoUsageAdapter,
      [provideMockRepository(DetallePedido, detallesRepository)],
    ));
  });

  afterEach(async () => {
    await module.close();
  });

  it('consulta solo el id de los detalles del producto, sin filtrar por estado', async () => {
    detallesRepository.findOne.mockResolvedValue({ id: 11 } as DetallePedido);

    await expect(adapter.isProductInAnyOrder(4)).resolves.toBe(true);
    expect(detallesRepository.findOne).toHaveBeenCalledWith({
      select: { id: true },
      where: { productoId: 4 },
    });
  });

  it('devuelve false cuando el producto no figura en ningún pedido', async () => {
    detallesRepository.findOne.mockResolvedValue(null);

    await expect(adapter.isProductInAnyOrder(4)).resolves.toBe(false);
  });
});
