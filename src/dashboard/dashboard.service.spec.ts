import type { TestingModule } from '@nestjs/testing';
import { createMockRepository } from '../../test/utils/mock-repository.js';
import type { MockRepository } from '../../test/utils/mock-repository.js';
import {
  createServiceTestModule,
  provideMockRepository,
} from '../../test/utils/test-module.helper.js';
import { Caja } from '../caja/entities/caja.entity.js';
import { Mesa } from '../mesas/entities/mesa.entity.js';
import { Pago } from '../pagos/entities/pago.entity.js';
import { Pedido } from '../pedidos/entities/pedido.entity.js';
import { DashboardService } from './dashboard.service.js';

describe('DashboardService', () => {
  let module: TestingModule;
  let service: DashboardService;
  let pagosRepository: MockRepository<Pago>;
  let mesasRepository: MockRepository<Mesa>;
  let pedidosRepository: MockRepository<Pedido>;
  let cajasRepository: MockRepository<Caja>;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-19T15:00:00.000Z'));
    pagosRepository = createMockRepository<Pago>();
    mesasRepository = createMockRepository<Mesa>();
    pedidosRepository = createMockRepository<Pedido>();
    cajasRepository = createMockRepository<Caja>();
    pagosRepository.queryBuilder.getRawOne.mockResolvedValue({
      total: '12500.5',
      pagos: '8',
    });
    mesasRepository.queryBuilder.getRawOne.mockResolvedValue({
      total: '12',
      libres: '5',
      ocupadas: '4',
      pendientes_cobro: '3',
    });
    pedidosRepository.queryBuilder.getRawOne.mockResolvedValue({
      total: '7',
      pendientes: '2',
      en_preparacion: '2',
      listos: '1',
      entregados: '2',
    });
    pedidosRepository.queryBuilder.getRawMany.mockResolvedValue([
      {
        id: '15',
        mesa: '5',
        items: '4',
        total: '4500.25',
        estado: 'entregado',
      },
    ]);
    cajasRepository.find.mockResolvedValue([
      Object.assign(new Caja(), {
        id: 2,
        estado: 'abierta',
        montoInicial: 5000,
        fechaApertura: new Date('2026-10-19T11:00:00.000Z'),
      }),
    ]);

    ({ module, service } = await createServiceTestModule(DashboardService, [
      provideMockRepository(Pago, pagosRepository),
      provideMockRepository(Mesa, mesasRepository),
      provideMockRepository(Pedido, pedidosRepository),
      provideMockRepository(Caja, cajasRepository),
    ]));
  });

  afterEach(async () => {
    await module.close();
    vi.useRealTimers();
  });

  it('agrega los cinco bloques y normaliza los tipos del driver', async () => {
    const result = await service.getDashboardResumen();

    expect(result).toEqual({
      ventas_dia: { total: 12500.5, pagos: 8 },
      mesas: { total: 12, libres: 5, ocupadas: 4, pendientes_cobro: 3 },
      pedidos_activos: {
        total: 7,
        pendientes: 2,
        en_preparacion: 2,
        listos: 1,
        entregados: 2,
      },
      caja: {
        estado: 'abierta',
        monto_inicial: 5000,
        fecha_apertura: '2026-10-19T11:00:00.000Z',
      },
      ultimos_pedidos: [
        {
          id: 15,
          mesa: 5,
          items: 4,
          total: 4500.25,
          estado: 'entregado',
        },
      ],
    });
  });

  it('consulta los pagos por intervalo local semiabierto convertido a UTC', async () => {
    await service.getDashboardResumen();

    expect(pagosRepository.queryBuilder.where).toHaveBeenCalledWith(
      'pago.fecha >= :start AND pago.fecha < :end',
      {
        start: new Date('2026-10-19T03:00:00.000Z'),
        end: new Date('2026-10-20T03:00:00.000Z'),
      },
    );
  });

  it('calcula los indicadores con agregaciones SQL sin cargar las colecciones', async () => {
    await service.getDashboardResumen();

    expect(pagosRepository.queryBuilder.select).toHaveBeenCalledWith(
      'COALESCE(SUM(pago.monto), 0)',
      'total',
    );
    expect(pagosRepository.queryBuilder.addSelect).toHaveBeenCalledWith(
      'COUNT(pago.id)',
      'pagos',
    );
    expect(mesasRepository.queryBuilder.select).toHaveBeenCalledWith(
      'COUNT(mesa.id)',
      'total',
    );
    expect(mesasRepository.queryBuilder.addSelect).toHaveBeenCalledWith(
      "COUNT(*) FILTER (WHERE mesa.estado = 'ocupada')",
      'ocupadas',
    );
    expect(pedidosRepository.queryBuilder.select).toHaveBeenCalledWith(
      'COUNT(pedido.id)',
      'total',
    );
    expect(pedidosRepository.queryBuilder.addSelect).toHaveBeenCalledWith(
      "COUNT(*) FILTER (WHERE pedido.estado = 'entregado')",
      'entregados',
    );
  });

  it('consulta solo los estados activos y agrega los renglones del pedido', async () => {
    await service.getDashboardResumen();

    expect(pedidosRepository.queryBuilder.where).toHaveBeenCalledWith(
      'pedido.estado IN (:...estados)',
      { estados: ['pendiente', 'en_preparacion', 'listo', 'entregado'] },
    );
    expect(pedidosRepository.queryBuilder.leftJoin).toHaveBeenCalledWith(
      'pedido.mesa',
      'mesa',
    );
    expect(pedidosRepository.queryBuilder.leftJoin).toHaveBeenCalledWith(
      'pedido.detalles',
      'detalle',
    );
    expect(pedidosRepository.queryBuilder.addSelect).toHaveBeenCalledWith(
      'COALESCE(SUM(detalle.cantidad), 0)',
      'items',
    );
    expect(pedidosRepository.queryBuilder.take).toHaveBeenCalledWith(50);
    expect(pedidosRepository.queryBuilder.orderBy).toHaveBeenCalledWith(
      'pedido.fecha',
      'DESC',
    );
    expect(pedidosRepository.queryBuilder.addOrderBy).toHaveBeenCalledWith(
      'pedido.id',
      'DESC',
    );
  });

  it('tolera varias cajas y elige la fecha más reciente con desempate por id', async () => {
    const olderCaja = Object.assign(new Caja(), {
      id: 1,
      estado: 'abierta',
      montoInicial: 1000,
      fechaApertura: new Date('2026-10-19T12:00:00.000Z'),
    });
    const latestCaja = Object.assign(new Caja(), {
      id: 2,
      estado: 'abierta',
      montoInicial: 5000,
      fechaApertura: new Date('2026-10-19T12:00:00.000Z'),
    });
    const previousDayCaja = Object.assign(new Caja(), {
      id: 99,
      estado: 'abierta',
      montoInicial: 9000,
      fechaApertura: new Date('2026-10-18T12:00:00.000Z'),
    });
    cajasRepository.find.mockResolvedValue([
      latestCaja,
      olderCaja,
      previousDayCaja,
    ]);

    await expect(service.getDashboardResumen()).resolves.toMatchObject({
      caja: { estado: 'abierta', monto_inicial: 5000 },
    });
    expect(cajasRepository.find).toHaveBeenCalledWith({
      where: { estado: 'abierta' },
      order: { fechaApertura: 'DESC', id: 'DESC' },
    });
  });

  it('devuelve ceros, colección vacía y nulos explícitos sin datos', async () => {
    pagosRepository.queryBuilder.getRawOne.mockResolvedValueOnce(null);
    mesasRepository.queryBuilder.getRawOne.mockResolvedValueOnce(null);
    pedidosRepository.queryBuilder.getRawOne.mockResolvedValueOnce(null);
    pedidosRepository.queryBuilder.getRawMany.mockResolvedValueOnce([]);
    cajasRepository.find.mockResolvedValueOnce([]);

    await expect(service.getDashboardResumen()).resolves.toEqual({
      ventas_dia: { total: 0, pagos: 0 },
      mesas: { total: 0, libres: 0, ocupadas: 0, pendientes_cobro: 0 },
      pedidos_activos: {
        total: 0,
        pendientes: 0,
        en_preparacion: 0,
        listos: 0,
        entregados: 0,
      },
      caja: { estado: 'cerrada', monto_inicial: null, fecha_apertura: null },
      ultimos_pedidos: [],
    });
  });
});