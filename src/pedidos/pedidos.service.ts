import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, MoreThanOrEqual } from 'typeorm';
import type { EntityManager, Repository } from 'typeorm';
import { CajaService } from '../caja/caja.service.js';
import { Mesa } from '../mesas/entities/mesa.entity.js';
import { PagosService } from '../pagos/pagos.service.js';
import { Producto } from '../productos/entities/producto.entity.js';
import type { CreatePedidoDto } from './dto/create-pedido.dto.js';
import type { PedidoPagoDto } from './dto/pedido-pago.dto.js';
import type { UpdatePedidoDto } from './dto/update-pedido.dto.js';
import { PedidoResponseDto } from './dto/pedido-response.dto.js';
import { DetallePedido } from './entities/detalle-pedido.entity.js';
import { Pedido } from './entities/pedido.entity.js';
import { ACTIVE_PEDIDO_ESTADOS } from './pedido-estado.js';
import type { PedidoEstado } from './pedido-estado.js';

export const TRANSICIONES_PEDIDO: Readonly<
  Record<PedidoEstado, readonly PedidoEstado[]>
> = {
  pendiente: ['en_preparacion', 'cancelado'],
  en_preparacion: ['listo', 'cancelado'],
  listo: ['entregado', 'cancelado'],
  entregado: ['cancelado'],
  pagado: [],
  cancelado: [],
};

const PEDIDO_RELATIONS = {
  mesa: true,
  usuario: true,
  detalles: true,
} as const;

@Injectable()
export class PedidosService {
  constructor(
    @InjectRepository(Pedido)
    private readonly pedidosRepository: Repository<Pedido>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly cajaService: CajaService,
    private readonly pagosService: PagosService,
  ) {}

  async findAll(): Promise<PedidoResponseDto[]> {
    const pedidos = await this.pedidosRepository.find({
      where: { estado: In(ACTIVE_PEDIDO_ESTADOS) },
      relations: PEDIDO_RELATIONS,
      order: { fecha: 'DESC' },
    });

    return pedidos.map((pedido) => PedidoResponseDto.fromEntity(pedido));
  }

  async findById(id: number): Promise<PedidoResponseDto> {
    const pedido = await this.pedidosRepository.findOne({
      where: { id },
      relations: PEDIDO_RELATIONS,
    });

    if (pedido === null) {
      throw new NotFoundException('Pedido no encontrado');
    }

    return PedidoResponseDto.fromEntity(pedido);
  }

  async createPedido(
    input: CreatePedidoDto,
    usuarioId: number,
  ): Promise<PedidoResponseDto> {
    const pedidoId = await this.dataSource.transaction(async (manager) => {
      const mesasRepository = manager.getRepository(Mesa);
      const productosRepository = manager.getRepository(Producto);
      const pedidosRepository = manager.getRepository(Pedido);

      const mesa = await mesasRepository.findOne({
        where: { id: input.mesa_id },
        lock: { mode: 'pessimistic_write' },
      });
      if (mesa === null) {
        throw new BadRequestException(`Mesa ${input.mesa_id} no encontrada`);
      }

      const pedidoActivo = await pedidosRepository.findOne({
        select: { id: true },
        where: { mesaId: mesa.id, estado: In(ACTIVE_PEDIDO_ESTADOS) },
      });
      if (pedidoActivo !== null) {
        throw new BadRequestException('La mesa ya tiene un pedido activo');
      }

      const cantidades = new Map<number, number>();
      for (const detalle of input.detalles) {
        cantidades.set(
          detalle.producto_id,
          (cantidades.get(detalle.producto_id) ?? 0) + detalle.cantidad,
        );
      }

      const productos = new Map<number, Producto>();
      for (const productoId of [...cantidades.keys()].sort((a, b) => a - b)) {
        const producto = await productosRepository.findOne({
          where: { id: productoId },
          lock: { mode: 'pessimistic_write' },
        });
        if (producto === null) {
          throw new BadRequestException(`Producto ${productoId} no encontrado`);
        }
        if (!producto.disponible) {
          throw new BadRequestException(`Producto ${productoId} no disponible`);
        }

        const solicitado = cantidades.get(productoId) ?? 0;
        if (producto.stock < solicitado) {
          throw stockInsuficiente(producto, solicitado);
        }
        productos.set(productoId, producto);
      }

      const detallesRepository = manager.getRepository(DetallePedido);
      let totalCentavos = 0;
      const detalles = input.detalles.map((detalle) => {
        const producto = productos.get(detalle.producto_id);
        if (producto === undefined) {
          throw new Error('Producto validado no encontrado en memoria');
        }
        const subtotalCentavos = toCents(producto.precio) * detalle.cantidad;
        totalCentavos += subtotalCentavos;
        return detallesRepository.create({
          productoId: detalle.producto_id,
          cantidad: detalle.cantidad,
          subtotal: subtotalCentavos / 100,
        });
      });

      for (const [productoId, cantidad] of cantidades) {
        const producto = productos.get(productoId);
        if (producto === undefined) {
          throw new Error('Producto validado no encontrado en memoria');
        }
        const result = await productosRepository.update(
          { id: productoId, stock: MoreThanOrEqual(cantidad) },
          { stock: producto.stock - cantidad },
        );
        if (result.affected !== 1) {
          throw stockInsuficiente(producto, cantidad);
        }
      }

      const pedido = pedidosRepository.create({
        mesaId: mesa.id,
        usuarioId,
        estado: 'pendiente',
        total: totalCentavos / 100,
        detalles,
      });
      const saved = await pedidosRepository.save(pedido);
      mesa.estado = 'ocupada';
      await mesasRepository.save(mesa);
      return saved.id;
    });

    return this.findById(pedidoId);
  }

  async updatePedidoEstado(
    id: number,
    input: UpdatePedidoDto,
  ): Promise<PedidoResponseDto> {
    await this.dataSource.transaction(async (manager) => {
      const pedidosRepository = manager.getRepository(Pedido);
      const pedido = await pedidosRepository.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (pedido === null) {
        throw new NotFoundException('Pedido no encontrado');
      }

      if (!TRANSICIONES_PEDIDO[pedido.estado].includes(input.estado)) {
        throw new BadRequestException(
          `No se puede cambiar el estado de '${pedido.estado}' a '${input.estado}'`,
        );
      }

      const hydratedPedido = await pedidosRepository.findOne({
        where: { id },
        relations: { detalles: true },
      });
      if (hydratedPedido === null) {
        throw new NotFoundException('Pedido no encontrado');
      }

      const mesasRepository = manager.getRepository(Mesa);
      const mesa = await mesasRepository.findOne({
        where: { id: pedido.mesaId },
        lock: { mode: 'pessimistic_write' },
      });
      if (mesa === null) {
        throw new Error(`Mesa ${pedido.mesaId} no encontrada para el pedido`);
      }

      if (input.estado === 'cancelado') {
        await this.restoreStock(manager, hydratedPedido.detalles);
        mesa.estado = 'libre';
      } else if (input.estado === 'entregado') {
        mesa.estado = 'pendiente_cobro';
      } else {
        mesa.estado = 'ocupada';
      }

      pedido.estado = input.estado;
      await pedidosRepository.save(pedido);
      await mesasRepository.save(mesa);
    });

    return this.findById(id);
  }

  async cobrarPedido(
    id: number,
    input: PedidoPagoDto,
    usuarioId: number,
  ): Promise<PedidoResponseDto> {
    await this.dataSource.transaction(async (manager) => {
      const pedidosRepository = manager.getRepository(Pedido);
      const pedido = await pedidosRepository.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (pedido === null) {
        throw new NotFoundException('Pedido no encontrado');
      }
      if (pedido.estado !== 'entregado') {
        throw new BadRequestException(
          `Solo se puede cobrar un pedido en estado 'entregado' (estado actual: '${pedido.estado}')`,
        );
      }

      const caja = await this.cajaService.findAbierta(manager);
      if (caja === null) {
        throw new BadRequestException(
          'No se puede cobrar un pedido sin una caja abierta',
        );
      }

      const pagoExistente = await this.pagosService.findByPedido(id, manager);
      if (pagoExistente !== null) {
        throw new BadRequestException('El pedido ya fue cobrado');
      }

      await this.pagosService.registrarPago(manager, {
        pedidoId: pedido.id,
        cajaId: caja.id,
        usuarioId,
        monto: Number(pedido.total),
        metodoPago: input.metodo_pago,
      });

      const mesasRepository = manager.getRepository(Mesa);
      const mesa = await mesasRepository.findOne({
        where: { id: pedido.mesaId },
        lock: { mode: 'pessimistic_write' },
      });
      if (mesa === null) {
        throw new Error(`Mesa ${pedido.mesaId} no encontrada para el pedido`);
      }

      pedido.estado = 'pagado';
      mesa.estado = 'libre';
      await pedidosRepository.save(pedido);
      await mesasRepository.save(mesa);
    });

    return this.findById(id);
  }

  private async restoreStock(
    manager: EntityManager,
    detalles: DetallePedido[],
  ): Promise<void> {
    const cantidades = new Map<number, number>();
    for (const detalle of detalles) {
      cantidades.set(
        detalle.productoId,
        (cantidades.get(detalle.productoId) ?? 0) + detalle.cantidad,
      );
    }

    const productosRepository = manager.getRepository(Producto);
    for (const productoId of [...cantidades.keys()].sort((a, b) => a - b)) {
      const producto = await productosRepository.findOne({
        where: { id: productoId },
        lock: { mode: 'pessimistic_write' },
      });
      if (producto === null) {
        throw new Error(
          `Producto ${productoId} no encontrado al reponer stock`,
        );
      }
      producto.stock += cantidades.get(productoId) ?? 0;
      await productosRepository.save(producto);
    }
  }
}

function toCents(value: number | string): number {
  return Math.round(Number(value) * 100);
}

function stockInsuficiente(
  producto: Producto,
  solicitado: number,
): BadRequestException {
  return new BadRequestException(
    `Stock insuficiente para '${producto.nombre}' (disponible: ${producto.stock}, solicitado: ${solicitado})`,
  );
}
