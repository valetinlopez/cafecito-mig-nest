import type { TestingModule } from '@nestjs/testing';
import { createMockRepository } from '../../test/utils/mock-repository.js';
import {
  createServiceTestModule,
  provideMockRepository,
} from '../../test/utils/test-module.helper.js';
import { Pago } from './entities/pago.entity.js';
import { PagosService } from './pagos.service.js';
import type { RegistrarPagoInput } from './pagos.service.js';

const PAGO_INPUT: RegistrarPagoInput = {
  pedidoId: 12,
  cajaId: 3,
  usuarioId: 2,
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

  it('expone las firmas del cobro aunque todavía no estén implementadas', () => {
    expect(typeof service.registrarPago).toBe('function');
    expect(typeof service.findByCaja).toBe('function');
    expect(typeof service.findByPedido).toBe('function');
  });

  it('mantiene registrarPago pendiente de MIG-33', async () => {
    await expect(service.registrarPago(PAGO_INPUT)).rejects.toMatchObject({
      status: 501,
    });
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
  });

  it('no consulta pagos cuando el listado de cajas está vacío', async () => {
    await expect(service.getTotalesVentas([])).resolves.toEqual(new Map());
    expect(pagosRepository.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('mantiene findByPedido pendiente de MIG-33', async () => {
    await expect(service.findByPedido(12)).rejects.toMatchObject({
      status: 501,
    });
  });
});
