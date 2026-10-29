import { Injectable, NotImplementedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { parseUtcTimestamp } from '../common/time/utc-date.js';
import { Usuario } from '../users/entities/usuario.entity.js';
import type { PagoResponseDto } from './dto/pago-response.dto.js';
import { Pago } from './entities/pago.entity.js';
import type { MetodoPago } from './metodo-pago.js';

/**
 * Datos que el cobro (`PedidosService`) entrega para registrar un pago.
 *
 * `monto` lo calcula el servidor a partir de `pedido.total` (D-03): no se
 * acepta un monto del cliente. `cajaId` y `usuarioId` los resuelve el servicio
 * del cobro; el request HTTP solo envía `metodo_pago`.
 */
export interface RegistrarPagoInput {
  pedidoId: number;
  cajaId: number;
  usuarioId: number;
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

const PENDING_OPERATION_MESSAGE =
  'Pagos: operación pendiente de implementación';

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
   * Implementación pendiente: MIG-33 (junto con el cambio a `pagado`, la
   * liberación de la mesa y el cierre contable en la caja).
   */
  registrarPago(_input: RegistrarPagoInput): Promise<PagoResponseDto> {
    return Promise.reject(this.pendingOperation('registrarPago', 'MIG-33'));
  }

  /**
   * Devuelve los pagos de una caja, del más reciente al más antiguo (MIG-32).
   */
  async findByCaja(cajaId: number): Promise<PagoMovimiento[]> {
    const rows = await this.pagosRepository
      .createQueryBuilder('pago')
      .leftJoin('pago.pedido', 'pedido')
      .leftJoin('pedido.mesa', 'mesa')
      .leftJoin(Usuario, 'usuario', 'usuario.id = pago.usuarioId')
      .select('pago.id', 'id')
      .addSelect('pago.fecha', 'fecha')
      .addSelect('pedido.id', 'pedido_id')
      .addSelect('mesa.numero', 'mesa_numero')
      .addSelect('pago.monto', 'monto')
      .addSelect('pago.metodoPago', 'metodo_pago')
      .addSelect('usuario.nombre', 'usuario_nombre')
      .where('pago.cajaId = :cajaId', { cajaId })
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
      .select('COALESCE(SUM(pago.monto), 0)', 'total_ventas')
      .where('pago.cajaId = :cajaId', { cajaId })
      .getRawOne<TotalVentasRaw>();

    return Number(result?.total_ventas ?? 0);
  }

  async getTotalesVentas(cajaIds: number[]): Promise<Map<number, number>> {
    const totals = new Map(cajaIds.map((id) => [id, 0]));
    if (cajaIds.length === 0) return totals;

    const rows = await this.pagosRepository
      .createQueryBuilder('pago')
      .select('pago.cajaId', 'caja_id')
      .addSelect('COALESCE(SUM(pago.monto), 0)', 'total_ventas')
      .where('pago.cajaId IN (:...cajaIds)', { cajaIds })
      .groupBy('pago.cajaId')
      .getRawMany<TotalCajaRaw>();

    for (const row of rows) {
      totals.set(Number(row.caja_id), Number(row.total_ventas ?? 0));
    }

    return totals;
  }

  /**
   * Devuelve el pago de un pedido, o `null` si todavía no se cobró.
   *
   * Implementación pendiente: MIG-33 (verificación previa al cobro).
   */
  findByPedido(_pedidoId: number): Promise<PagoResponseDto | null> {
    return Promise.reject(this.pendingOperation('findByPedido', 'MIG-33'));
  }

  private pendingOperation(
    operation: string,
    ticket: string,
  ): NotImplementedException {
    return new NotImplementedException(
      `${PENDING_OPERATION_MESSAGE} (${ticket}): ${operation}`,
    );
  }
}
