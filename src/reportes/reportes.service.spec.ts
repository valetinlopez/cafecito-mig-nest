import { BadRequestException } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { createMockRepository } from '../../test/utils/mock-repository.js';
import type { MockRepository } from '../../test/utils/mock-repository.js';
import {
  createServiceTestModule,
  provideMockRepository,
} from '../../test/utils/test-module.helper.js';
import { Caja } from '../caja/entities/caja.entity.js';
import { Pago } from '../pagos/entities/pago.entity.js';
import { DetallePedido } from '../pedidos/entities/detalle-pedido.entity.js';
import { Pedido } from '../pedidos/entities/pedido.entity.js';
import { ReporteVentasQueryDto } from './dto/reporte-ventas-query.dto.js';
import { ReportesService } from './reportes.service.js';

const PERIODO = Object.assign(new ReporteVentasQueryDto(), {
  desde: '2026-10-01',
  hasta: '2026-10-19',
});

/** 2026-10-01 00:00 y 2026-10-20 00:00 en Buenos Aires (UTC-3). */
const RANGO_UTC = {
  start: new Date('2026-10-01T03:00:00.000Z'),
  end: new Date('2026-10-20T03:00:00.000Z'),
};

describe('ReportesService', () => {
  let module: TestingModule;
  let service: ReportesService;
  let pagosRepository: MockRepository<Pago>;
  let pedidosRepository: MockRepository<Pedido>;
  let detallesRepository: MockRepository<DetallePedido>;
  let cajasRepository: MockRepository<Caja>;

  beforeEach(async () => {
    pagosRepository = createMockRepository<Pago>();
    pedidosRepository = createMockRepository<Pedido>();
    detallesRepository = createMockRepository<DetallePedido>();
    cajasRepository = createMockRepository<Caja>();

    pagosRepository.queryBuilder.getRawOne.mockResolvedValue({
      total_vendido: '125000.00',
      cantidad_cobros: '84',
      pedidos_cobrados: '80',
    });
    pagosRepository.queryBuilder.getRawMany.mockResolvedValue([
      { metodo_pago: 'efectivo', cantidad: '40', total: '60000.00' },
      { metodo_pago: 'debito', cantidad: '44', total: '65000.00' },
    ]);
    detallesRepository.queryBuilder.getRawMany.mockResolvedValue([
      {
        producto_id: '1',
        nombre: 'Café con leche',
        cantidad: '120',
        total: '102000.00',
      },
    ]);
    pedidosRepository.queryBuilder.getRawMany.mockResolvedValue([
      {
        mesa_id: '1',
        numero: '1',
        cantidad_pedidos: '18',
        total: '27000.00',
      },
    ]);
    cajasRepository.queryBuilder.getRawMany.mockResolvedValue([
      {
        caja_id: '1',
        estado: 'cerrada',
        fecha_apertura: new Date('2026-10-18T11:00:00.000Z'),
        fecha_cierre: new Date('2026-10-18T23:00:00.000Z'),
        monto_inicial: '1000.00',
        monto_final: '41500.00',
        ventas_efectivo: '40000.00',
      },
    ]);

    ({ module, service } = await createServiceTestModule(ReportesService, [
      provideMockRepository(Pago, pagosRepository),
      provideMockRepository(Pedido, pedidosRepository),
      provideMockRepository(DetallePedido, detallesRepository),
      provideMockRepository(Caja, cajasRepository),
    ]));
  });

  afterEach(async () => {
    await module.close();
  });

  it('agrega los cinco bloques con los tipos del driver normalizados', async () => {
    const result = await service.getReporteVentas(PERIODO);

    expect(result).toEqual({
      periodo: { desde: '2026-10-01', hasta: '2026-10-19' },
      resumen: {
        total_vendido: 125000,
        cantidad_cobros: 84,
        pedidos_cobrados: 80,
        ticket_promedio: 1488.1,
      },
      ventas_por_metodo: [
        { metodo_pago: 'efectivo', cantidad: 40, total: 60000 },
        { metodo_pago: 'debito', cantidad: 44, total: 65000 },
      ],
      productos_mas_vendidos: [
        {
          producto_id: 1,
          nombre: 'Café con leche',
          cantidad: 120,
          total: 102000,
        },
      ],
      mesas_utilizadas: [
        {
          mesa_id: 1,
          numero: 1,
          cantidad_pedidos: 18,
          total: 27000,
        },
      ],
      cajas: [
        {
          caja_id: 1,
          estado: 'cerrada',
          fecha_apertura: '2026-10-18T11:00:00.000Z',
          fecha_cierre: '2026-10-18T23:00:00.000Z',
          monto_inicial: 1000,
          ventas_efectivo: 40000,
          monto_final: 41500,
          diferencia: 500,
        },
      ],
    });
  });

  it('consulta el período local inclusivo convertido a UTC semiabierto', async () => {
    await service.getReporteVentas(PERIODO);

    expect(pagosRepository.queryBuilder.where).toHaveBeenCalledWith(
      'pago.fecha >= :start AND pago.fecha < :end',
      RANGO_UTC,
    );
    expect(detallesRepository.queryBuilder.where).toHaveBeenCalledWith(
      'pago.fecha >= :start AND pago.fecha < :end',
      RANGO_UTC,
    );
    expect(pedidosRepository.queryBuilder.where).toHaveBeenCalledWith(
      'pago.fecha >= :start AND pago.fecha < :end',
      RANGO_UTC,
    );
  });

  it('resuelve agrupaciones, orden y top 20 en la base', async () => {
    await service.getReporteVentas(PERIODO);

    expect(pagosRepository.queryBuilder.select).toHaveBeenCalledWith(
      'COALESCE(SUM(pago.monto), 0)',
      'total_vendido',
    );
    expect(pagosRepository.queryBuilder.addSelect).toHaveBeenCalledWith(
      'COUNT(DISTINCT pago.pedidoId)',
      'pedidos_cobrados',
    );
    expect(pagosRepository.queryBuilder.groupBy).toHaveBeenCalledWith(
      'pago.metodoPago',
    );
    expect(pagosRepository.queryBuilder.orderBy).toHaveBeenCalledWith(
      'total',
      'DESC',
    );

    expect(detallesRepository.queryBuilder.innerJoin).toHaveBeenCalledWith(
      'pedido.pagos',
      'pago',
    );
    expect(detallesRepository.queryBuilder.groupBy).toHaveBeenCalledWith(
      'producto.id',
    );
    expect(detallesRepository.queryBuilder.orderBy).toHaveBeenCalledWith(
      'cantidad',
      'DESC',
    );
    expect(detallesRepository.queryBuilder.limit).toHaveBeenCalledWith(20);

    expect(pedidosRepository.queryBuilder.groupBy).toHaveBeenCalledWith(
      'mesa.id',
    );
    expect(pedidosRepository.queryBuilder.orderBy).toHaveBeenCalledWith(
      'cantidad_pedidos',
      'DESC',
    );
  });

  it('excluye las cajas que no intersectan el período y suma el efectivo de la caja', async () => {
    await service.getReporteVentas(PERIODO);

    expect(cajasRepository.queryBuilder.where).toHaveBeenCalledWith(
      'caja.fechaApertura < :end',
      { end: RANGO_UTC.end },
    );
    expect(cajasRepository.queryBuilder.andWhere).toHaveBeenCalledWith(
      '(caja.fechaCierre IS NULL OR caja.fechaCierre >= :start)',
      { start: RANGO_UTC.start },
    );
    expect(cajasRepository.queryBuilder.addSelect).toHaveBeenCalledWith(
      'COALESCE(SUM(CASE WHEN pago.metodoPago = :metodoEfectivo THEN pago.monto ELSE 0 END), 0)',
      'ventas_efectivo',
    );
  });

  it('devuelve ceros y listas vacías cuando no hay ventas en el período', async () => {
    pagosRepository.queryBuilder.getRawOne.mockResolvedValueOnce(null);
    pagosRepository.queryBuilder.getRawMany.mockResolvedValueOnce([]);
    detallesRepository.queryBuilder.getRawMany.mockResolvedValueOnce([]);
    pedidosRepository.queryBuilder.getRawMany.mockResolvedValueOnce([]);
    cajasRepository.queryBuilder.getRawMany.mockResolvedValueOnce([]);

    await expect(service.getReporteVentas(PERIODO)).resolves.toEqual({
      periodo: { desde: '2026-10-01', hasta: '2026-10-19' },
      resumen: {
        total_vendido: 0,
        cantidad_cobros: 0,
        pedidos_cobrados: 0,
        ticket_promedio: 0,
      },
      ventas_por_metodo: [],
      productos_mas_vendidos: [],
      mesas_utilizadas: [],
      cajas: [],
    });
  });

  it('no divide por cero cuando hay cobros sin pedidos distintos', async () => {
    pagosRepository.queryBuilder.getRawOne.mockResolvedValueOnce({
      total_vendido: '0.00',
      cantidad_cobros: '0',
      pedidos_cobrados: '0',
    });

    await expect(service.getReporteVentas(PERIODO)).resolves.toMatchObject({
      resumen: { ticket_promedio: 0 },
    });
  });

  it('deja la diferencia en null para la caja abierta y la conserva negativa', async () => {
    cajasRepository.queryBuilder.getRawMany.mockResolvedValueOnce([
      {
        caja_id: '2',
        estado: 'abierta',
        fecha_apertura: '2026-10-19 11:00:00.000',
        fecha_cierre: null,
        monto_inicial: '1000.00',
        monto_final: null,
        ventas_efectivo: '2500.50',
      },
      {
        caja_id: '3',
        estado: 'cerrada',
        fecha_apertura: new Date('2026-10-18T11:00:00.000Z'),
        fecha_cierre: '2026-10-18 23:00:00.000',
        monto_inicial: '1000.00',
        monto_final: '3000.00',
        ventas_efectivo: '2500.00',
      },
    ]);

    const { cajas } = await service.getReporteVentas(PERIODO);

    expect(cajas[0]).toEqual({
      caja_id: 2,
      estado: 'abierta',
      fecha_apertura: '2026-10-19T11:00:00.000Z',
      fecha_cierre: null,
      monto_inicial: 1000,
      ventas_efectivo: 2500.5,
      monto_final: null,
      diferencia: null,
    });
    expect(cajas[1]).toMatchObject({
      caja_id: 3,
      fecha_cierre: '2026-10-18T23:00:00.000Z',
      diferencia: -500,
    });
  });

  it('normaliza a cero los agregados que el driver devuelve nulos', async () => {
    pagosRepository.queryBuilder.getRawMany.mockResolvedValueOnce([
      { metodo_pago: 'efectivo', cantidad: null, total: null },
    ]);
    detallesRepository.queryBuilder.getRawMany.mockResolvedValueOnce([
      { producto_id: '1', nombre: 'Café', cantidad: null, total: null },
    ]);
    pedidosRepository.queryBuilder.getRawMany.mockResolvedValueOnce([
      { mesa_id: '1', numero: '1', cantidad_pedidos: null, total: null },
    ]);
    cajasRepository.queryBuilder.getRawMany.mockResolvedValueOnce([
      {
        caja_id: '1',
        estado: 'cerrada',
        fecha_apertura: new Date('2026-10-18T11:00:00.000Z'),
        fecha_cierre: new Date('2026-10-18T23:00:00.000Z'),
        monto_inicial: '0.00',
        monto_final: '0.00',
        ventas_efectivo: null,
      },
    ]);

    const result = await service.getReporteVentas(PERIODO);

    expect(result.ventas_por_metodo).toEqual([
      { metodo_pago: 'efectivo', cantidad: 0, total: 0 },
    ]);
    expect(result.productos_mas_vendidos).toEqual([
      { producto_id: 1, nombre: 'Café', cantidad: 0, total: 0 },
    ]);
    expect(result.mesas_utilizadas).toEqual([
      { mesa_id: 1, numero: 1, cantidad_pedidos: 0, total: 0 },
    ]);
    expect(result.cajas[0]).toMatchObject({
      ventas_efectivo: 0,
      monto_final: 0,
      diferencia: 0,
    });
  });

  it('rechaza un período invertido con 400 y sin consultar la base', async () => {
    const invertido = Object.assign(new ReporteVentasQueryDto(), {
      desde: '2026-10-19',
      hasta: '2026-10-01',
    });

    await expect(service.getReporteVentas(invertido)).rejects.toThrow(
      new BadRequestException(
        "La fecha 'desde' no puede ser posterior a 'hasta'",
      ),
    );
    expect(pagosRepository.createQueryBuilder).not.toHaveBeenCalled();
    expect(cajasRepository.createQueryBuilder).not.toHaveBeenCalled();
  });
});
