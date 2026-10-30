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
import { Pedido } from '../pedidos/entities/pedido.entity.js';
import { ACTIVE_PEDIDO_ESTADOS } from '../pedidos/pedido-estado.js';
import { PedidoActiveOrdersAdapter } from './pedido-active-orders.adapter.js';

describe('PedidoActiveOrdersAdapter', () => {
  let module: TestingModule;
  let adapter: PedidoActiveOrdersAdapter;
  let pedidosRepository: MockRepository<Pedido>;

  beforeEach(async () => {
    pedidosRepository = createMockRepository<Pedido>();
    ({ module, service: adapter } = await createServiceTestModule(
      PedidoActiveOrdersAdapter,
      [provideMockRepository(Pedido, pedidosRepository)],
    ));
  });

  afterEach(async () => {
    await module.close();
  });

  it('consulta solo pedidos activos de la mesa', async () => {
    pedidosRepository.findOne.mockResolvedValue({ id: 33 } as Pedido);

    await expect(adapter.hasUnpaidActiveOrderForTable(8)).resolves.toBe(true);
    expect(pedidosRepository.findOne).toHaveBeenCalledWith({
      select: { id: true },
      where: {
        mesaId: 8,
        estado: In(ACTIVE_PEDIDO_ESTADOS),
      },
    });
  });

  it('devuelve false cuando no hay pedido activo', async () => {
    pedidosRepository.findOne.mockResolvedValue(null);

    await expect(adapter.hasUnpaidActiveOrderForTable(8)).resolves.toBe(false);
  });
});
