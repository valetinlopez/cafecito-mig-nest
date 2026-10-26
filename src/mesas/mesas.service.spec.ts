import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QueryFailedError } from 'typeorm';
import { ACTIVE_ORDERS_PORT } from './active-orders.port.js';
import type { ActiveOrdersPort } from './active-orders.port.js';
import type { Mesa } from './entities/mesa.entity.js';
import { Mesa as MesaEntity } from './entities/mesa.entity.js';
import { MesasModule } from './mesas.module.js';
import { MesasService, TRANSICIONES_MESA } from './mesas.service.js';
import {
  createMockRepository,
  type MockRepository,
} from '../../test/utils/mock-repository.js';
import {
  createServiceTestModule,
  provideMockRepository,
} from '../../test/utils/test-module.helper.js';

describe('MesasService', () => {
  let module: TestingModule;
  let service: MesasService;
  let repository: MockRepository<Mesa>;
  let repositoryForDefaultProvider: MockRepository<Mesa>;
  let activeOrders: ActiveOrdersPort & {
    hasUnpaidActiveOrderForTable: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    repository = createMockRepository<Mesa>();
    repositoryForDefaultProvider = createMockRepository<Mesa>();
    activeOrders = {
      hasUnpaidActiveOrderForTable: vi.fn().mockResolvedValue(false),
    };

    ({ module, service } = await createServiceTestModule(MesasService, [
      provideMockRepository(MesaEntity, repository),
      { provide: ACTIVE_ORDERS_PORT, useValue: activeOrders },
    ]));
  });

  afterEach(async () => {
    await module.close();
  });

  it('lista mesas ordenadas por número', async () => {
    const rows = [
      { id: 1, numero: 1, estado: 'libre' as const },
      { id: 3, numero: 3, estado: 'ocupada' as const },
    ];
    repository.find.mockResolvedValue(rows);

    await expect(service.findAll()).resolves.toEqual(rows);
    expect(repository.find).toHaveBeenCalledWith({ order: { numero: 'ASC' } });
  });

  it('devuelve una lista vacía cuando no hay mesas', async () => {
    repository.find.mockResolvedValue([]);

    await expect(service.findAll()).resolves.toEqual([]);
    expect(repository.find).toHaveBeenCalledWith({ order: { numero: 'ASC' } });
  });

  it('resuelve por id y lanza 404 si no existe', async () => {
    const mesa = { id: 4, numero: 4, estado: 'libre' as const };
    repository.findOneBy
      .mockResolvedValueOnce(mesa)
      .mockResolvedValueOnce(null);

    await expect(service.findById(4)).resolves.toBe(mesa);
    await expect(service.findById(99)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('crea la mesa en estado libre', async () => {
    repository.create.mockReturnValue({ numero: 8, estado: 'libre' } as Mesa);
    repository.save.mockResolvedValue({ id: 8, numero: 8, estado: 'libre' });

    await expect(service.create({ numero: 8 })).resolves.toEqual({
      id: 8,
      numero: 8,
      estado: 'libre',
    });
    expect(repository.create).toHaveBeenCalledWith({
      numero: 8,
      estado: 'libre',
    });
  });

  it('traduce el unique de número duplicado a 400 con mensaje contractual', async () => {
    const driverError = Object.assign(new Error('duplicate'), {
      code: '23505',
      constraint: 'mesas_numero_key',
    });
    repository.create.mockReturnValue({ numero: 8, estado: 'libre' } as Mesa);
    repository.save.mockRejectedValue(
      new QueryFailedError('INSERT', [], driverError),
    );

    await expect(service.create({ numero: 8 })).rejects.toMatchObject({
      status: 400,
      response: { message: 'Ya existe una mesa con el número 8' },
    });
  });

  it.each(
    Object.entries(TRANSICIONES_MESA).flatMap(([from, targets]) =>
      targets.map((to) => [from, to] as const),
    ),
  )('permite transición manual %s → %s', async (from, to) => {
    const mesa = { id: 2, numero: 2, estado: from } as Mesa;
    repository.findOneBy.mockResolvedValue(mesa);
    activeOrders.hasUnpaidActiveOrderForTable.mockResolvedValue(false);
    repository.save.mockImplementation((saved) =>
      Promise.resolve(saved as Mesa),
    );

    await expect(service.update(2, { estado: to })).resolves.toMatchObject({
      estado: to,
    });
  });

  it.each([
    ['ocupada', 'pendiente_cobro'],
    ['pendiente_cobro', 'libre'],
    ['libre', 'en_limpieza'],
  ] as const)(
    'rechaza transición automática/ilegal %s → %s',
    async (from, to) => {
      const save = repository.save;
      repository.findOneBy.mockResolvedValue({
        id: 2,
        numero: 2,
        estado: from,
      });

      const update = service.update(2, { estado: to });
      await expect(update).rejects.toBeInstanceOf(BadRequestException);
      expect(save.mock.calls).toHaveLength(0);
    },
  );

  it('bloquea limpieza cuando existe un pedido activo sin cobrar', async () => {
    const save = repository.save;
    repository.findOneBy.mockResolvedValue({
      id: 2,
      numero: 2,
      estado: 'ocupada',
    });
    activeOrders.hasUnpaidActiveOrderForTable.mockResolvedValue(true);

    await expect(
      service.update(2, { estado: 'en_limpieza' }),
    ).rejects.toMatchObject({
      status: 400,
      response: {
        message:
          'No se puede pasar la mesa a limpieza: tiene un pedido activo sin cobrar',
      },
    });
    expect(activeOrders.hasUnpaidActiveOrderForTable.mock.calls).toEqual([[2]]);
    expect(save.mock.calls).toHaveLength(0);
  });

  it('falla cerrado si el port de pedidos no puede responder', async () => {
    const save = repository.save;
    repository.findOneBy.mockResolvedValue({
      id: 2,
      numero: 2,
      estado: 'ocupada',
    });
    activeOrders.hasUnpaidActiveOrderForTable.mockRejectedValue(
      new Error('provider unavailable'),
    );

    await expect(
      service.update(2, { estado: 'en_limpieza' }),
    ).rejects.toMatchObject({ status: 500 });
    expect(save.mock.calls).toHaveLength(0);
  });

  it('rechaza limpieza con el provider temporal fail-closed', async () => {
    const moduleWithDefaultPort = await Test.createTestingModule({
      imports: [MesasModule],
    })
      .overrideProvider(getRepositoryToken(MesaEntity))
      .useValue(repositoryForDefaultProvider)
      .compile();
    const serviceWithDefaultPort = moduleWithDefaultPort.get(MesasService);
    repositoryForDefaultProvider.findOneBy.mockResolvedValue({
      id: 2,
      numero: 2,
      estado: 'ocupada',
    });

    await expect(
      serviceWithDefaultPort.update(2, { estado: 'en_limpieza' }),
    ).rejects.toMatchObject({ status: 500 });
    expect(repositoryForDefaultProvider.save.mock.calls).toHaveLength(0);
    await moduleWithDefaultPort.close();
  });
});
