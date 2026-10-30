import { NotFoundException } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { In, MoreThanOrEqual } from 'typeorm';
import type { EntityManager } from 'typeorm';
import { CajaService } from '../caja/caja.service.js';
import type { Caja } from '../caja/entities/caja.entity.js';
import { PagosService } from '../pagos/pagos.service.js';
import {
  asDataSource,
  createMockDataSource,
  type MockDataSource,
} from '../../test/utils/mock-data-source.js';
import {
  createMockRepository,
  type MockRepository,
} from '../../test/utils/mock-repository.js';
import {
  createServiceTestModule,
  provideMockRepository,
} from '../../test/utils/test-module.helper.js';
import { Mesa } from '../mesas/entities/mesa.entity.js';
import { Producto } from '../productos/entities/producto.entity.js';
import { DetallePedido } from './entities/detalle-pedido.entity.js';
import { Pedido } from './entities/pedido.entity.js';
import { PEDIDO_ESTADOS } from './pedido-estado.js';
import { PedidosService, TRANSICIONES_PEDIDO } from './pedidos.service.js';

function pedidoFixture(id: number): Pedido {
  return {
    id,
    estado: 'pendiente',
    total: 25,
    fecha: new Date('2026-10-29T12:00:00.000Z'),
    mesaId: 3,
    usuarioId: 5,
    mesa: { id: 3, numero: 8, estado: 'ocupada' },
    usuario: {
      id: 5,
      nombre: 'Valentín',
      email: 'valentin@example.com',
      rol: 'mozo',
      activo: true,
      passwordHash: 'secret',
    },
    detalles: [
      {
        id: 11,
        pedidoId: id,
        productoId: 4,
        cantidad: 1,
        subtotal: 25,
      } as DetallePedido,
    ],
    pagos: [],
  };
}

describe('PedidosService', () => {
  let module: TestingModule;
  let service: PedidosService;
  let pedidosRepository: MockRepository<Pedido>;
  let mesasRepository: MockRepository<Mesa>;
  let productosRepository: MockRepository<Producto>;
  let detallesRepository: MockRepository<DetallePedido>;
  let transactionRepositories: Map<unknown, unknown>;
  let getTransactionRepository: ReturnType<typeof vi.fn>;
  let dataSource: MockDataSource;
  let cajaService: { findAbierta: ReturnType<typeof vi.fn> };
  let pagosService: {
    findByPedido: ReturnType<typeof vi.fn>;
    registrarPago: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    pedidosRepository = createMockRepository<Pedido>();
    mesasRepository = createMockRepository<Mesa>();
    productosRepository = createMockRepository<Producto>();
    detallesRepository = createMockRepository<DetallePedido>();
    transactionRepositories = new Map<unknown, unknown>([
      [Pedido, pedidosRepository],
      [Mesa, mesasRepository],
      [Producto, productosRepository],
      [DetallePedido, detallesRepository],
    ]);
    getTransactionRepository = vi.fn((entity: unknown) =>
      transactionRepositories.get(entity),
    );
    cajaService = { findAbierta: vi.fn() };
    pagosService = {
      findByPedido: vi.fn(),
      registrarPago: vi.fn(),
    };
    const manager = {
      getRepository: getTransactionRepository,
    } as unknown as EntityManager;
    dataSource = createMockDataSource(manager);
    ({ module, service } = await createServiceTestModule(PedidosService, [
      provideMockRepository(Pedido, pedidosRepository),
      {
        provide: getDataSourceToken(),
        useValue: asDataSource(dataSource),
      },
      { provide: CajaService, useValue: cajaService },
      { provide: PagosService, useValue: pagosService },
    ]));
  });

  afterEach(async () => {
    await module.close();
  });

  it('lista pedidos activos ordenados por fecha descendente y los proyecta a DTO', async () => {
    const pedido = pedidoFixture(12);
    pedidosRepository.find.mockResolvedValue([pedido]);

    const result = await service.findAll();

    expect(pedidosRepository.find).toHaveBeenCalledWith({
      where: {
        estado: In(['pendiente', 'en_preparacion', 'listo', 'entregado']),
      },
      relations: { mesa: true, usuario: true, detalles: true },
      order: { fecha: 'DESC' },
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 12,
      total: 25,
      mesa: { id: 3, numero: 8 },
      usuario: { id: 5, nombre: 'Valentín' },
      detalles: [{ id: 11, producto_id: 4, subtotal: 25 }],
    });
  });

  it('devuelve una lista vacía si no hay pedidos activos', async () => {
    pedidosRepository.find.mockResolvedValue([]);

    await expect(service.findAll()).resolves.toEqual([]);
  });

  it('obtiene un pedido por id y devuelve 404 cuando no existe', async () => {
    pedidosRepository.findOne.mockResolvedValueOnce(pedidoFixture(12));
    pedidosRepository.findOne.mockResolvedValueOnce(null);

    await expect(service.findById(12)).resolves.toMatchObject({ id: 12 });
    expect(pedidosRepository.findOne).toHaveBeenNthCalledWith(1, {
      where: { id: 12 },
      relations: { mesa: true, usuario: true, detalles: true },
    });
    await expect(service.findById(404)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('crea pedido con stock agregado, renglones preservados y mesa ocupada', async () => {
    const mesa = { id: 8, numero: 8, estado: 'libre' as const } as Mesa;
    const producto = {
      id: 20,
      nombre: 'Café',
      precio: '12.50',
      stock: 8,
      disponible: true,
    } as Producto;
    const savedPedido = {
      ...pedidoFixture(45),
      total: 62.5,
      detalles: [
        { id: 1, pedidoId: 45, productoId: 20, cantidad: 2, subtotal: 25 },
        { id: 2, pedidoId: 45, productoId: 20, cantidad: 3, subtotal: 37.5 },
      ] as DetallePedido[],
    };
    mesasRepository.findOne.mockResolvedValue(mesa);
    mesasRepository.save.mockResolvedValue(mesa);
    pedidosRepository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(savedPedido);
    pedidosRepository.create.mockImplementation((input) => input as Pedido);
    pedidosRepository.save.mockResolvedValue(savedPedido);
    productosRepository.findOne.mockResolvedValue(producto);
    productosRepository.update.mockResolvedValue({
      affected: 1,
      raw: [],
      generatedMaps: [],
    });
    detallesRepository.create.mockImplementation(
      (input) => input as DetallePedido,
    );

    const result = await service.createPedido(
      {
        mesa_id: 8,
        detalles: [
          { producto_id: 20, cantidad: 2 },
          { producto_id: 20, cantidad: 3 },
        ],
      },
      5,
    );

    expect(dataSource.transaction).toHaveBeenCalledOnce();
    expect(mesasRepository.findOne).toHaveBeenCalledWith({
      where: { id: 8 },
      lock: { mode: 'pessimistic_write' },
    });
    expect(productosRepository.findOne).toHaveBeenCalledWith({
      where: { id: 20 },
      lock: { mode: 'pessimistic_write' },
    });
    expect(productosRepository.update).toHaveBeenCalledWith(
      { id: 20, stock: MoreThanOrEqual(5) },
      { stock: 3 },
    );
    expect(
      detallesRepository.create.mock.calls.map(([detail]) => detail),
    ).toEqual([
      { productoId: 20, cantidad: 2, subtotal: 25 },
      { productoId: 20, cantidad: 3, subtotal: 37.5 },
    ]);
    expect(pedidosRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mesaId: 8,
        usuarioId: 5,
        estado: 'pendiente',
        total: 62.5,
      }),
    );
    expect(mesa.estado).toBe('ocupada');
    expect(result.total).toBe(62.5);
  });

  it('bloquea productos en orden ascendente de id', async () => {
    const mesa = { id: 8, numero: 8, estado: 'libre' as const } as Mesa;
    const products = new Map<number, Producto>([
      [
        4,
        {
          id: 4,
          nombre: 'Agua',
          precio: '1.00',
          stock: 5,
          disponible: true,
        } as Producto,
      ],
      [
        20,
        {
          id: 20,
          nombre: 'Café',
          precio: '2.00',
          stock: 5,
          disponible: true,
        } as Producto,
      ],
    ]);
    mesasRepository.findOne.mockResolvedValue(mesa);
    pedidosRepository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(pedidoFixture(46));
    pedidosRepository.create.mockImplementation((input) => input as Pedido);
    pedidosRepository.save.mockResolvedValue({ ...pedidoFixture(46), id: 46 });
    mesasRepository.save.mockResolvedValue(mesa);
    productosRepository.findOne.mockImplementation((options) => {
      const where = options.where;
      if (
        where === undefined ||
        Array.isArray(where) ||
        where.id === undefined
      ) {
        return Promise.resolve(null);
      }
      if (typeof where.id !== 'number') {
        return Promise.resolve(null);
      }
      return Promise.resolve(products.get(where.id) ?? null);
    });
    productosRepository.update.mockResolvedValue({
      affected: 1,
      raw: [],
      generatedMaps: [],
    });
    detallesRepository.create.mockImplementation(
      (input) => input as DetallePedido,
    );

    await service.createPedido(
      {
        mesa_id: 8,
        detalles: [
          { producto_id: 20, cantidad: 1 },
          { producto_id: 4, cantidad: 1 },
        ],
      },
      5,
    );

    expect(
      productosRepository.findOne.mock.calls.map(([options]) => options),
    ).toEqual([
      { where: { id: 4 }, lock: { mode: 'pessimistic_write' } },
      { where: { id: 20 }, lock: { mode: 'pessimistic_write' } },
    ]);
  });

  it('rechaza stock insuficiente antes de escribir cambios', async () => {
    mesasRepository.findOne.mockResolvedValue({
      id: 8,
      numero: 8,
      estado: 'libre',
    });
    pedidosRepository.findOne.mockResolvedValue(null);
    productosRepository.findOne.mockResolvedValue({
      id: 20,
      nombre: 'Café',
      precio: '12.50',
      stock: 4,
      disponible: true,
    } as Producto);

    await expect(
      service.createPedido(
        {
          mesa_id: 8,
          detalles: [
            { producto_id: 20, cantidad: 2 },
            { producto_id: 20, cantidad: 3 },
          ],
        },
        5,
      ),
    ).rejects.toMatchObject({
      status: 400,
      response: {
        message:
          "Stock insuficiente para 'Café' (disponible: 4, solicitado: 5)",
      },
    });
    expect(productosRepository.update).not.toHaveBeenCalled();
    expect(pedidosRepository.save).not.toHaveBeenCalled();
    expect(mesasRepository.save).not.toHaveBeenCalled();
  });

  it('propaga un fallo tardío de creación para que la transacción haga rollback', async () => {
    mesasRepository.findOne.mockResolvedValue({
      id: 8,
      numero: 8,
      estado: 'libre',
    });
    pedidosRepository.findOne.mockResolvedValueOnce(null);
    pedidosRepository.create.mockImplementation((input) => input as Pedido);
    pedidosRepository.save.mockResolvedValue({ ...pedidoFixture(46), id: 46 });
    productosRepository.findOne.mockResolvedValue({
      id: 20,
      nombre: 'Café',
      precio: '12.50',
      stock: 8,
      disponible: true,
    } as Producto);
    productosRepository.update.mockResolvedValue({
      affected: 1,
      raw: [],
      generatedMaps: [],
    });
    detallesRepository.create.mockImplementation(
      (input) => input as DetallePedido,
    );
    mesasRepository.save.mockRejectedValue(new Error('mesa write failed'));

    await expect(
      service.createPedido(
        { mesa_id: 8, detalles: [{ producto_id: 20, cantidad: 2 }] },
        5,
      ),
    ).rejects.toThrow('mesa write failed');
    expect(dataSource.transaction).toHaveBeenCalledOnce();
    expect(productosRepository.update).toHaveBeenCalledOnce();
    expect(pedidosRepository.save).toHaveBeenCalledOnce();
    expect(pedidosRepository.findOne).toHaveBeenCalledOnce();
  });

  it('rechaza una mesa inexistente sin consultar pedidos ni productos', async () => {
    mesasRepository.findOne.mockResolvedValue(null);

    await expect(
      service.createPedido(
        { mesa_id: 99, detalles: [{ producto_id: 20, cantidad: 1 }] },
        5,
      ),
    ).rejects.toMatchObject({
      status: 400,
      response: { message: 'Mesa 99 no encontrada' },
    });
    expect(pedidosRepository.findOne).not.toHaveBeenCalled();
    expect(productosRepository.findOne).not.toHaveBeenCalled();
  });

  it('rechaza mesa con pedido activo antes de tocar productos', async () => {
    mesasRepository.findOne.mockResolvedValue({
      id: 8,
      numero: 8,
      estado: 'ocupada',
    });
    pedidosRepository.findOne.mockResolvedValueOnce({ id: 40 } as Pedido);

    await expect(
      service.createPedido(
        { mesa_id: 8, detalles: [{ producto_id: 20, cantidad: 1 }] },
        5,
      ),
    ).rejects.toMatchObject({
      status: 400,
      response: { message: 'La mesa ya tiene un pedido activo' },
    });
    expect(productosRepository.findOne).not.toHaveBeenCalled();
  });

  it('al entregar cambia la mesa a pendiente_cobro dentro de la transacción', async () => {
    const pedido = pedidoFixture(12);
    pedido.estado = 'listo';
    const mesa = { id: 3, numero: 8, estado: 'ocupada' as const } as Mesa;
    pedidosRepository.findOne
      .mockResolvedValueOnce(pedido)
      .mockResolvedValueOnce(pedido)
      .mockResolvedValueOnce(pedido);
    pedidosRepository.save.mockResolvedValue(pedido);
    mesasRepository.findOne.mockResolvedValue(mesa);
    mesasRepository.save.mockResolvedValue(mesa);

    const result = await service.updatePedidoEstado(12, {
      estado: 'entregado',
    });

    expect(pedidosRepository.findOne).toHaveBeenNthCalledWith(1, {
      where: { id: 12 },
      lock: { mode: 'pessimistic_write' },
    });
    expect(pedido.estado).toBe('entregado');
    expect(mesa.estado).toBe('pendiente_cobro');
    expect(result.estado).toBe('entregado');
  });

  it('al cancelar repone el stock agregado y libera la mesa', async () => {
    const pedido = pedidoFixture(12);
    pedido.detalles = [
      { productoId: 9, cantidad: 2 } as DetallePedido,
      { productoId: 4, cantidad: 3 } as DetallePedido,
      { productoId: 9, cantidad: 1 } as DetallePedido,
    ];
    const mesa = { id: 3, numero: 8, estado: 'ocupada' as const } as Mesa;
    const productoMenor = {
      id: 4,
      nombre: 'Agua',
      precio: '1.00',
      stock: 7,
      disponible: true,
    } as Producto;
    const productoMayor = {
      id: 9,
      nombre: 'Café',
      precio: '2.00',
      stock: 5,
      disponible: true,
    } as Producto;
    pedidosRepository.findOne
      .mockResolvedValueOnce(pedido)
      .mockResolvedValueOnce(pedido)
      .mockResolvedValueOnce(pedido);
    pedidosRepository.save.mockResolvedValue(pedido);
    mesasRepository.findOne.mockResolvedValue(mesa);
    mesasRepository.save.mockResolvedValue(mesa);
    productosRepository.findOne
      .mockResolvedValueOnce(productoMenor)
      .mockResolvedValueOnce(productoMayor);
    productosRepository.save.mockImplementation((product) =>
      Promise.resolve(product as Producto),
    );

    await service.updatePedidoEstado(12, { estado: 'cancelado' });

    expect(
      productosRepository.findOne.mock.calls.map(([options]) => options),
    ).toEqual([
      {
        where: { id: 4 },
        lock: { mode: 'pessimistic_write' },
      },
      {
        where: { id: 9 },
        lock: { mode: 'pessimistic_write' },
      },
    ]);
    expect(productoMenor.stock).toBe(10);
    expect(productoMayor.stock).toBe(8);
    expect(mesa.estado).toBe('libre');
    expect(pedido.estado).toBe('cancelado');
  });

  it('rechaza marcar pagado por una transición manual', async () => {
    const pedido = pedidoFixture(12);
    pedidosRepository.findOne.mockResolvedValueOnce(pedido);

    await expect(
      service.updatePedidoEstado(12, { estado: 'pagado' }),
    ).rejects.toMatchObject({
      status: 400,
      response: {
        message: "No se puede cambiar el estado de 'pendiente' a 'pagado'",
      },
    });
    expect(pedidosRepository.save).not.toHaveBeenCalled();
    expect(mesasRepository.save).not.toHaveBeenCalled();
  });

  it.each(
    PEDIDO_ESTADOS.flatMap((from) =>
      PEDIDO_ESTADOS.map(
        (to) => [from, to, TRANSICIONES_PEDIDO[from].includes(to)] as const,
      ),
    ),
  )(
    'aplica transición %s → %s según la máquina declarada',
    async (from, to, allowed) => {
      const pedido = pedidoFixture(12);
      pedido.estado = from;
      const mesa = { id: 3, numero: 8, estado: 'ocupada' as const } as Mesa;
      pedidosRepository.findOne
        .mockResolvedValueOnce(pedido)
        .mockResolvedValueOnce(pedido)
        .mockResolvedValueOnce(pedido);
      pedidosRepository.save.mockResolvedValue(pedido);
      mesasRepository.findOne.mockResolvedValue(mesa);
      mesasRepository.save.mockResolvedValue(mesa);
      productosRepository.findOne.mockResolvedValue({
        id: 4,
        nombre: 'Agua',
        precio: '1.00',
        stock: 5,
        disponible: true,
      } as Producto);
      productosRepository.save.mockImplementation((product) =>
        Promise.resolve(product as Producto),
      );

      const operation = service.updatePedidoEstado(12, { estado: to });
      if (allowed) {
        await expect(operation).resolves.toMatchObject({ estado: to });
      } else {
        await expect(operation).rejects.toMatchObject({ status: 400 });
      }
    },
  );

  it('cobra total cero y libera la mesa dentro de la transacción', async () => {
    const pedido = pedidoFixture(12);
    pedido.estado = 'entregado';
    pedido.total = 0;
    const mesa = {
      id: 3,
      numero: 8,
      estado: 'pendiente_cobro' as const,
    } as Mesa;
    const caja = { id: 6, estado: 'abierta' } as Caja;
    pedidosRepository.findOne
      .mockResolvedValueOnce(pedido)
      .mockResolvedValueOnce(pedido);
    pedidosRepository.save.mockResolvedValue(pedido);
    mesasRepository.findOne.mockResolvedValue(mesa);
    mesasRepository.save.mockResolvedValue(mesa);
    cajaService.findAbierta.mockResolvedValue(caja);
    pagosService.findByPedido.mockResolvedValue(null);
    pagosService.registrarPago.mockResolvedValue({});

    const result = await service.cobrarPedido(
      12,
      { metodo_pago: 'efectivo' },
      5,
    );

    expect(pedidosRepository.findOne).toHaveBeenNthCalledWith(1, {
      where: { id: 12 },
      lock: { mode: 'pessimistic_write' },
    });
    expect(cajaService.findAbierta).toHaveBeenCalledWith(
      expect.objectContaining({ getRepository: getTransactionRepository }),
    );
    expect(pagosService.registrarPago).toHaveBeenCalledWith(
      expect.any(Object),
      {
        pedidoId: 12,
        cajaId: 6,
        usuarioId: 5,
        monto: 0,
        metodoPago: 'efectivo',
      },
    );
    expect(pedido.estado).toBe('pagado');
    expect(mesa.estado).toBe('libre');
    expect(result.estado).toBe('pagado');
  });

  it('no registra pago si el pedido no está entregado', async () => {
    pedidosRepository.findOne.mockResolvedValueOnce(pedidoFixture(12));

    await expect(
      service.cobrarPedido(12, { metodo_pago: 'efectivo' }, 5),
    ).rejects.toMatchObject({
      status: 400,
      response: {
        message:
          "Solo se puede cobrar un pedido en estado 'entregado' (estado actual: 'pendiente')",
      },
    });
    expect(cajaService.findAbierta).not.toHaveBeenCalled();
    expect(pagosService.registrarPago).not.toHaveBeenCalled();
  });

  it('no registra pago si no hay caja abierta', async () => {
    const pedido = pedidoFixture(12);
    pedido.estado = 'entregado';
    pedidosRepository.findOne.mockResolvedValueOnce(pedido);
    cajaService.findAbierta.mockResolvedValue(null);

    await expect(
      service.cobrarPedido(12, { metodo_pago: 'efectivo' }, 5),
    ).rejects.toMatchObject({
      status: 400,
      response: {
        message: 'No se puede cobrar un pedido sin una caja abierta',
      },
    });
    expect(pagosService.registrarPago).not.toHaveBeenCalled();
  });

  it('rechaza un pedido con pago existente sin registrar un segundo pago', async () => {
    const pedido = pedidoFixture(12);
    pedido.estado = 'entregado';
    pedidosRepository.findOne.mockResolvedValueOnce(pedido);
    cajaService.findAbierta.mockResolvedValue({ id: 6, estado: 'abierta' });
    pagosService.findByPedido.mockResolvedValue({ id: 33 });

    await expect(
      service.cobrarPedido(12, { metodo_pago: 'efectivo' }, 5),
    ).rejects.toMatchObject({
      status: 400,
      response: { message: 'El pedido ya fue cobrado' },
    });
    expect(pagosService.registrarPago).not.toHaveBeenCalled();
  });

  it('propaga errores de persistencia del cobro dentro de la transacción', async () => {
    const pedido = pedidoFixture(12);
    pedido.estado = 'entregado';
    pedidosRepository.findOne.mockResolvedValueOnce(pedido);
    cajaService.findAbierta.mockResolvedValue({ id: 6, estado: 'abierta' });
    pagosService.findByPedido.mockResolvedValue(null);
    pagosService.registrarPago.mockRejectedValue(new Error('insert failed'));

    await expect(
      service.cobrarPedido(12, { metodo_pago: 'efectivo' }, 5),
    ).rejects.toThrow('insert failed');
    expect(dataSource.transaction).toHaveBeenCalledOnce();
    expect(pedidosRepository.save).not.toHaveBeenCalled();
    expect(mesasRepository.save).not.toHaveBeenCalled();
  });

  it('propaga fallo al liberar mesa tras registrar el pago para revertir el cobro', async () => {
    const pedido = pedidoFixture(12);
    pedido.estado = 'entregado';
    pedidosRepository.findOne.mockResolvedValueOnce(pedido);
    cajaService.findAbierta.mockResolvedValue({ id: 6, estado: 'abierta' });
    pagosService.findByPedido.mockResolvedValue(null);
    pagosService.registrarPago.mockResolvedValue({ id: 33 });
    mesasRepository.findOne.mockResolvedValue({
      id: 3,
      numero: 8,
      estado: 'pendiente_cobro',
    });
    mesasRepository.save.mockRejectedValue(new Error('mesa release failed'));

    await expect(
      service.cobrarPedido(12, { metodo_pago: 'efectivo' }, 5),
    ).rejects.toThrow('mesa release failed');
    expect(dataSource.transaction).toHaveBeenCalledOnce();
    expect(pagosService.registrarPago).toHaveBeenCalledOnce();
    expect(pedidosRepository.save).toHaveBeenCalledOnce();
  });
});
