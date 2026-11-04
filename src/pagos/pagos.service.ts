import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { EntityManager, Repository } from 'typeorm';
import { Caja } from '../caja/entities/caja.entity.js';
import { parseUtcTimestamp } from '../common/time/utc-date.js';
import { PagoResponseDto } from './dto/pago-response.dto.js';
import { Pago } from './entities/pago.entity.js';
import type { MetodoPago } from './metodo-pago.js';
import { PAGO_EN_PERIODO_DE_CAJA } from './pago-periodo-caja.js';

/**
 * Datos que el cobro (`PedidosService`) entrega para registrar un pago.
 *
 * `monto` lo calcula el servidor a partir de `pedido.total` (D-03): no se
 * acepta un monto del cliente; el request HTTP solo envía `metodo_pago`.
 */
export interface RegistrarPagoInput {
  pedidoId: number;
  monto: number;
  metodoPago: MetodoPago;
}

export interface PagoMovimiento {
  id: number;
  fecha: Date;
  pedido_id: number;
  mesa_numero: number;
  monto: number;
  metodo_pago: MetodoPago;
  usuario_nombre: string | null;
}

interface PagoMovimientoRaw {
  id: number;
  fecha: Date | string;
  pedido_id: number;
  mesa_numero: number;
  monto: number | string;
  metodo_pago: MetodoPago;
  usuario_nombre: string | null;
}

interface TotalCajaRaw {
  caja_id: number | string;
  total_ventas: number | string | null;
}

interface TotalVentasRaw {
  total_ventas: number | string | null;
}

/**
 * Acceso a datos de `pagos` (MIG-31).
 *
 * Es un módulo de soporte: no tiene controller ni endpoints propios. El cobro
 * se dispara desde `POST /api/v1/pedidos/{id}/pago` y los movimientos se leen
 * desde `GET /api/v1/caja/{id}/movimientos`.
 *
 * MIG-32 implementa las lecturas de movimientos y sumatorias que consume Caja.
 * Registrar pagos y buscar el pago de un pedido pertenecen a MIG-33.
 */
@Injectable()
export class PagosService {
  constructor(
    @InjectRepository(Pago)
    private readonly pagosRepository: Repository<Pago>,
  ) {}

  /**
   * Registra el pago de un pedido dentro de la transacción del cobro.
   *
   * Usa el `EntityManager` del cobro para que el pago se revierta junto con el
   * estado del pedido y de la mesa si falla cualquier paso de la operación.
   */
  async registrarPago(
    manager: EntityManager,
    input: RegistrarPagoInput,
  ): Promise<PagoResponseDto> {
    const repository = manager.getRepository(Pago);
    const pago = repository.create({
      pedidoId: input.pedidoId,
      monto: input.monto,
      metodoPago: input.metodoPago,
      fecha: new Date(),
    });
    const saved = await repository.save(pago);
    return PagoResponseDto.fromEntity(saved);
  }

  /**
   * Devuelve los pagos del período de una caja, del más reciente al más antiguo.
   * `usuario_nombre` es quien registró el pedido, como en el legacy (ADR 0009).
   */
  async findByCaja(cajaId: number): Promise<PagoMovimiento[]> {
    const rows = await this.pagosRepository
      .createQueryBuilder('pago')
      .leftJoin('pago.pedido', 'pedido')
      .leftJoin('pedido.mesa', 'mesa')
      .leftJoin('pedido.usuario', 'usuario')
      .innerJoin(Caja, 'caja', PAGO_EN_PERIODO_DE_CAJA)
      .select('pago.id', 'id')
      .addSelect('pago.fecha', 'fecha')
      .addSelect('pedido.id', 'pedido_id')
      .addSelect('mesa.numero', 'mesa_numero')
      .addSelect('pago.monto', 'monto')
      .addSelect('pago.metodoPago', 'metodo_pago')
      .addSelect('usuario.nombre', 'usuario_nombre')
      .where('caja.id = :cajaId', { cajaId })
      .setParameter('ahora', new Date())
      .orderBy('pago.fecha', 'DESC')
      .getRawMany<PagoMovimientoRaw>();

    return rows.map((row) => ({
      id: Number(row.id),
      fecha:
        row.fecha instanceof Date ? row.fecha : parseUtcTimestamp(row.fecha),
      pedido_id: Number(row.pedido_id),
      mesa_numero: Number(row.mesa_numero),
      monto: Number(row.monto),
      metodo_pago: row.metodo_pago,
      usuario_nombre: row.usuario_nombre,
    }));
  }

  async getTotalVentas(cajaId: number): Promise<number> {
    const result = await this.pagosRepository
      .createQueryBuilder('pago')
      .innerJoin(Caja, 'caja', PAGO_EN_PERIODO_DE_CAJA)
      .select('COALESCE(SUM(pago.monto), 0)', 'total_ventas')
      .where('caja.id = :cajaId', { cajaId })
      .setParameter('ahora', new Date())
      .getRawOne<TotalVentasRaw>();

    return Number(result?.total_ventas ?? 0);
  }

  async getTotalesVentas(cajaIds: number[]): Promise<Map<number, number>> {
    const totals = new Map(cajaIds.map((id) => [id, 0]));
    if (cajaIds.length === 0) return totals;

    const rows = await this.pagosRepository
      .createQueryBuilder('pago')
      .innerJoin(Caja, 'caja', PAGO_EN_PERIODO_DE_CAJA)
      .select('caja.id', 'caja_id')
      .addSelect('COALESCE(SUM(pago.monto), 0)', 'total_ventas')
      .where('caja.id IN (:...cajaIds)', { cajaIds })
      .setParameter('ahora', new Date())
      .groupBy('caja.id')
      .getRawMany<TotalCajaRaw>();

    for (const row of rows) {
      totals.set(Number(row.caja_id), Number(row.total_ventas ?? 0));
    }

    return totals;
  }

  /**
   * Devuelve el pago de un pedido, o `null` si todavía no se cobró.
   *
   * Puede usar el manager transaccional del cobro; sin él, usa el repositorio
   * normal para consultas independientes.
   */
  async findByPedido(
    pedidoId: number,
    manager?: EntityManager,
  ): Promise<PagoResponseDto | null> {
    const repository = manager?.getRepository(Pago) ?? this.pagosRepository;
    const pago = await repository.findOneBy({ pedidoId });
    return pago === null ? null : PagoResponseDto.fromEntity(pago);
  }
}
