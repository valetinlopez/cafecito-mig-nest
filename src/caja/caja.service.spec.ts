import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getDataSourceToken } from '@nestjs/typeorm';
import type { EntityManager, Repository } from 'typeorm';
import { createMockRepository } from '../../test/utils/mock-repository.js';
import {
  asDataSource,
  createMockDataSource,
} from '../../test/utils/mock-data-source.js';
import {
  createServiceTestModule,
  provideMockRepository,
} from '../../test/utils/test-module.helper.js';
import { PagosService } from '../pagos/pagos.service.js';
import { Caja } from './entities/caja.entity.js';
import { CajaService } from './caja.service.js';

const OPEN_CAJA = Object.assign(new Caja(), {
  id: 2,
  fechaApertura: new Date('2026-10-19T11:00:00.000Z'),
  fechaCierre: null,
  montoInicial: 1000,
  montoFinal: null,
  estado: 'abierta',
});

function makeManager(
  repository: ReturnType<typeof createMockRepository<Caja>>,
) {
  return {
    query: vi.fn<(...args: unknown[]) => Promise<unknown[]>>(),
    find: vi.fn<(...args: unknown[]) => Promise<Caja[]>>(),
    create: vi.fn<(...args: unknown[]) => Caja>(),
    save: vi.fn<(...args: unknown[]) => Promise<Caja>>(),
    getRepository: vi.fn(() => repository as unknown as Repository<Caja>),
  };
}

describe('CajaService', () => {
  const cajaRepository = createMockRepository<Caja>();
  const pagosService = {
    findByCaja: vi.fn<PagosService['findByCaja']>(() => Promise.resolve([])),
    getTotalVentas: vi.fn<PagosService['getTotalVentas']>(),
    getTotalesVentas: vi.fn<PagosService['getTotalesVentas']>(),
  };
  let service: CajaService;
  let module: Awaited<ReturnType<typeof createServiceTestModule>>['module'];
  let manager: ReturnType<typeof makeManager>;
  let dataSource: ReturnType<typeof createMockDataSource>;

  beforeEach(async () => {
    vi.clearAllMocks();
    cajaRepository.find.mockReset();
    cajaRepository.find.mockResolvedValue([]);
    manager = makeManager(cajaRepository);
    manager.query.mockResolvedValue([]);
    manager.find.mockResolvedValue([]);
    manager.create.mockReturnValue(OPEN_CAJA);
    manager.save.mockResolvedValue(OPEN_CAJA);
    dataSource = createMockDataSource(manager as unknown as EntityManager);
    pagosService.getTotalVentas.mockResolvedValue(0);
    pagosService.getTotalesVentas.mockImplementation((ids) =>
      Promise.resolve(new Map(ids.map((id) => [id, 0]))),
    );
    pagosService.findByCaja.mockResolvedValue([]);
    ({ module, service } = await createServiceTestModule(CajaService, [
      provideMockRepository(Caja, cajaRepository),
      { provide: getDataSourceToken(), useValue: asDataSource(dataSource) },
      { provide: PagosService, useValue: pagosService },
    ]));
  });

  afterEach(async () => {
    await module.close();
  });

  it('devuelve null si no hay caja abierta y mapea la caja si existe', async () => {
    cajaRepository.find
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([OPEN_CAJA]);
    pagosService.getTotalVentas.mockResolvedValue(2200);

    await expect(service.getCajaAbierta()).resolves.toBeNull();
    await expect(service.getCajaAbierta()).resolves.toMatchObject({
      id: 2,
      estado: 'abierta',
      total_ventas: 2200,
    });
  });

  it('ordena el historial por fecha de apertura descendente y agrega totales en lote', async () => {
    cajaRepository.find.mockResolvedValue([OPEN_CAJA]);
    pagosService.getTotalesVentas.mockResolvedValue(new Map([[2, 900]]));

    await expect(service.getTodasLasCajas()).resolves.toMatchObject([
      { id: 2, total_ventas: 900 },
    ]);
    expect(cajaRepository.find).toHaveBeenCalledWith({
      order: { fechaApertura: 'DESC' },
    });
    expect(pagosService.getTotalesVentas).toHaveBeenCalledWith([2]);
  });

  it('abre caja bajo advisory transaction lock y rechaza una caja ya abierta', async () => {
    manager.find.mockResolvedValueOnce([]);
    manager.create.mockReturnValue(OPEN_CAJA);
    manager.save.mockResolvedValue(OPEN_CAJA);

    await expect(
      service.abrirCaja({ monto_inicial: 1000 }),
    ).resolves.toMatchObject({
      id: 2,
      estado: 'abierta',
    });
    expect(manager.query).toHaveBeenCalledWith(
      'SELECT pg_advisory_xact_lock($1, $2)',
      [1128351301, 32],
    );

    manager.find.mockResolvedValueOnce([OPEN_CAJA]);
    await expect(service.abrirCaja({ monto_inicial: 1000 })).rejects.toThrow(
      new BadRequestException('Ya hay una caja abierta'),
    );
  });

  it('cierra la caja abierta con lock pesimista y conserva ventas calculadas', async () => {
    const closedCaja = Object.assign(new Caja(), {
      ...OPEN_CAJA,
      fechaCierre: new Date('2026-10-19T20:00:00.000Z'),
      montoFinal: 3500,
      estado: 'cerrada',
    });
    manager.find.mockResolvedValueOnce([OPEN_CAJA]);
    manager.save.mockResolvedValue(closedCaja);
    pagosService.getTotalVentas.mockResolvedValue(2500);

    await expect(
      service.cerrarCaja({ monto_final: 3500 }),
    ).resolves.toMatchObject({
      estado: 'cerrada',
      monto_final: 3500,
      total_ventas: 2500,
    });
    expect(manager.find).toHaveBeenCalledWith(
      Caja,
      expect.objectContaining({ lock: { mode: 'pessimistic_write' } }),
    );
  });

  it('rechaza cerrar si no hay caja abierta', async () => {
    manager.find.mockResolvedValueOnce([]);

    await expect(service.cerrarCaja({ monto_final: 3500 })).rejects.toThrow(
      new BadRequestException('No hay una caja abierta'),
    );
  });

  it('valida la existencia de caja antes de devolver movimientos', async () => {
    cajaRepository.findOneBy.mockResolvedValue(null);

    await expect(service.getMovimientosCaja(99)).rejects.toThrow(
      new NotFoundException('Caja no encontrada'),
    );
  });
});
