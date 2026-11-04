import type { TestingModule } from '@nestjs/testing';
import type { EntityManager } from 'typeorm';
import { createMockRepository } from '../../test/utils/mock-repository.js';
import {
  createServiceTestModule,
  provideMockRepository,
} from '../../test/utils/test-module.helper.js';
import { Caja } from '../caja/entities/caja.entity.js';
import { Pago } from './entities/pago.entity.js';
import { PAGO_EN_PERIODO_DE_CAJA } from './pago-periodo-caja.js';
import { PagosService } from './pagos.service.js';
import type { RegistrarPagoInput } from './pagos.service.js';

const PAGO_INPUT: RegistrarPagoInput = {
  pedidoId: 12,
  monto: 950,
  metodoPago: 'efectivo',
};

describe('PagosService', () => {
  let module: TestingModule;
  let service: PagosService;
  const pagosRepository = createMockRepository<Pago>();

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ module, service } = await createServiceTestModule(PagosService, [
      provideMockRepository(Pago, pagosRepository),
    ]));
  });

  afterEach(async () => {
    await module.close();
  });

  function expectConsultaPorPeriodo(): void {
    expect(pagosRepository.queryBuilder.innerJoin).toHaveBeenCalledWith(
      Caja,
      'caja',
      PAGO_EN_PERIODO_DE_CAJA,
    );
    expect(pagosRepository.queryBuilder.setParameter).toHaveBeenCalledWith(
      'ahora',
      expect.any(Date),
    );
  }

  it('expone las operaciones de cobro y consulta de pago', () => {
    expect(typeof service.registrarPago).toBe('function');
    expect(typeof service.findByCaja).toBe('function');
    expect(typeof service.findByPedido).toBe('function');
  });

  it('registra el pago en el repositorio del manager transaccional', async () => {
    const pago = {
      id: 33,
      pedidoId: PAGO_INPUT.pedidoId,
      monto: PAGO_INPUT.monto,
      metodoPago: PAGO_INPUT.metodoPago,
      fecha: new Date('2026-10-29T12:00:00.000Z'),
    } as Pago;
    const getRepository = vi.fn(() => pagosRepository);
    const manager = { getRepository } as unknown as EntityManager;
    pagosRepository.create.mockImplementation((input) => input as Pago);
    pagosRepository.save.mockResolvedValue(pago);

    await expect(
      service.registrarPago(manager, PAGO_INPUT),
    ).resolves.toMatchObject({
      id: 33,
      pedido_id: 12,
      metodo_pago: 'efectivo',
      monto: 950,
      fecha: '2026-10-29T12:00:00.000Z',
    });
    expect(getRepository).toHaveBeenCalledWith(Pago);
    expect(pagosRepository.create).toHaveBeenCalledWith({
      pedidoId: 12,
      monto: 950,
      metodoPago: 'efectivo',
      fecha: expect.any(Date) as Date,
    });
  });

  it('define el período de la caja con ambos límites incluidos y sin cierre hasta ahora', () => {
    expect(PAGO_EN_PERIODO_DE_CAJA).toBe(
      'pago.fecha >= caja.fechaApertura AND pago.fecha <= COALESCE(caja.fechaCierre, :ahora)',
    );
  });

  it('consulta movimientos de caja con pedido, mesa y usuario y ordena fecha DESC', async () => {
    pagosRepository.queryBuilder.getRawMany.mockResolvedValue([
      {
        id: 8,
        fecha: new Date('2026-10-19T17:00:00.000Z'),
        pedido_id: 14,
        mesa_numero: 2,
        monto: '1250.50',
        metodo_pago: 'debito',
        usuario_nombre: null,
      },
    ]);

    await expect(service.findByCaja(3)).resolves.toEqual([
      {
        id: 8,
        fecha: new Date('2026-10-19T17:00:00.000Z'),
        pedido_id: 14,
        mesa_numero: 2,
        monto: 1250.5,
        metodo_pago: 'debito',
        usuario_nombre: null,
      },
    ]);
    expect(pagosRepository.queryBuilder.orderBy).toHaveBeenCalledWith(
      'pago.fecha',
      'DESC',
    );
    expect(pagosRepository.queryBuilder.leftJoin).toHaveBeenCalledWith(
      'pago.pedido',
      'pedido',
    );
    expect(pagosRepository.queryBuilder.leftJoin).toHaveBeenCalledWith(
      'pedido.mesa',
      'mesa',
    );
    expect(pagosRepository.queryBuilder.leftJoin).toHaveBeenCalledWith(
      'pedido.usuario',
      'usuario',
    );
    expectConsultaPorPeriodo();
    expect(pagosRepository.queryBuilder.where).toHaveBeenCalledWith(
      'caja.id = :cajaId',
      { cajaId: 3 },
    );
  });

  it('calcula total de ventas y normaliza cero cuando no hay pagos', async () => {
    pagosRepository.queryBuilder.getRawOne.mockResolvedValue({
      total_ventas: '0',
    });

    await expect(service.getTotalVentas(3)).resolves.toBe(0);
    expect(pagosRepository.queryBuilder.select).toHaveBeenCalledWith(
      'COALESCE(SUM(pago.monto), 0)',
      'total_ventas',
    );
    expectConsultaPorPeriodo();
    expect(pagosRepository.queryBuilder.where).toHaveBeenCalledWith(
      'caja.id = :cajaId',
      { cajaId: 3 },
    );
  });

  it('obtiene total de ventas agrupado para varias cajas', async () => {
    pagosRepository.queryBuilder.getRawMany.mockResolvedValue([
      { caja_id: 2, total_ventas: '300.25' },
      { caja_id: 4, total_ventas: '0' },
    ]);

    await expect(service.getTotalesVentas([2, 4])).resolves.toEqual(
      new Map([
        [2, 300.25],
        [4, 0],
      ]),
    );
    expectConsultaPorPeriodo();
    expect(pagosRepository.queryBuilder.where).toHaveBeenCalledWith(
      'caja.id IN (:...cajaIds)',
      { cajaIds: [2, 4] },
    );
    expect(pagosRepository.queryBuilder.groupBy).toHaveBeenCalledWith(
      'caja.id',
    );
  });

  it('no consulta pagos cuando el listado de cajas está vacío', async () => {
    await expect(service.getTotalesVentas([])).resolves.toEqual(new Map());
    expect(pagosRepository.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('busca un pago por pedido y devuelve null cuando no existe', async () => {
    pagosRepository.findOneBy.mockResolvedValueOnce({
      id: 33,
      pedidoId: 12,
      monto: 950,
      metodoPago: 'efectivo',
      fecha: new Date('2026-10-29T12:00:00.000Z'),
    } as Pago);
    pagosRepository.findOneBy.mockResolvedValueOnce(null);

    await expect(service.findByPedido(12)).resolves.toMatchObject({
      pedido_id: 12,
      monto: 950,
    });
    await expect(service.findByPedido(404)).resolves.toBeNull();
    expect(pagosRepository.findOneBy).toHaveBeenNthCalledWith(1, {
      pedidoId: 12,
    });
  });
});
