import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { Caja } from '../caja/entities/caja.entity.js';
import { getBusinessDayRange } from '../common/time/business-timezone.js';
import { Mesa } from '../mesas/entities/mesa.entity.js';
import { Pago } from '../pagos/entities/pago.entity.js';
import { ACTIVE_PEDIDO_ESTADOS } from '../pedidos/pedido-estado.js';
import type { PedidoEstado } from '../pedidos/pedido-estado.js';
import { Pedido } from '../pedidos/entities/pedido.entity.js';
import {
  DashboardResumenResponseDto,
  type DashboardMesasData,
  type DashboardPedidosActivosData,
  type DashboardPedidoRecienteData,
  type DashboardVentasDiaData,
} from './dto/dashboard-resumen-response.dto.js';

const RECENT_ORDERS_LIMIT = 50;

interface PagoResumenRaw {
  total: number | string | null;
  pagos: number | string | null;
}

interface MesasResumenRaw {
  total: number | string;
  libres: number | string;
  ocupadas: number | string;
  pendientes_cobro: number | string;
}

interface PedidosResumenRaw {
  total: number | string;
  pendientes: number | string;
  en_preparacion: number | string;
  listos: number | string;
  entregados: number | string;
}

interface PedidoRecienteRaw {
  id: number | string;
  mesa: number | string;
  items: number | string | null;
  total: number | string;
  estado: PedidoEstado;
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Pago)
    private readonly pagosRepository: Repository<Pago>,
    @InjectRepository(Mesa)
    private readonly mesasRepository: Repository<Mesa>,
    @InjectRepository(Pedido)
    private readonly pedidosRepository: Repository<Pedido>,
    @InjectRepository(Caja)
    private readonly cajasRepository: Repository<Caja>,
  ) {}

  async getDashboardResumen(): Promise<DashboardResumenResponseDto> {
    const [ventasDia, mesas, pedidosActivos, cajasAbiertas, ultimosPedidos] =
      await Promise.all([
        this.getVentasDia(),
        this.getMesasResumen(),
        this.getPedidosActivosResumen(),
        this.cajasRepository.find({
          where: { estado: 'abierta' },
          order: { fechaApertura: 'DESC', id: 'DESC' },
        }),
        this.getUltimosPedidos(),
      ]);

    return DashboardResumenResponseDto.fromData({
      ventasDia,
      mesas,
      pedidosActivos,
      caja: cajasAbiertas[0] ?? null,
      ultimosPedidos,
    });
  }

  private async getVentasDia(): Promise<DashboardVentasDiaData> {
    const { start, end } = getBusinessDayRange(new Date());
    const raw = await this.pagosRepository
      .createQueryBuilder('pago')
      .select('COALESCE(SUM(pago.monto), 0)', 'total')
      .addSelect('COUNT(pago.id)', 'pagos')
      .where('pago.fecha >= :start AND pago.fecha < :end', { start, end })
      .getRawOne<PagoResumenRaw>();

    return {
      total: Number(raw?.total ?? 0),
      pagos: Number(raw?.pagos ?? 0),
    };
  }

  private async getMesasResumen(): Promise<DashboardMesasData> {
    const raw = await this.mesasRepository
      .createQueryBuilder('mesa')
      .select('COUNT(mesa.id)', 'total')
      .addSelect("COUNT(*) FILTER (WHERE mesa.estado = 'libre')", 'libres')
      .addSelect("COUNT(*) FILTER (WHERE mesa.estado = 'ocupada')", 'ocupadas')
      .addSelect(
        "COUNT(*) FILTER (WHERE mesa.estado = 'pendiente_cobro')",
        'pendientes_cobro',
      )
      .getRawOne<MesasResumenRaw>();

    return {
      total: Number(raw?.total ?? 0),
      libres: Number(raw?.libres ?? 0),
      ocupadas: Number(raw?.ocupadas ?? 0),
      pendientes_cobro: Number(raw?.pendientes_cobro ?? 0),
    };
  }

  private async getPedidosActivosResumen(): Promise<DashboardPedidosActivosData> {
    const raw = await this.pedidosRepository
      .createQueryBuilder('pedido')
      .select('COUNT(pedido.id)', 'total')
      .addSelect(
        "COUNT(*) FILTER (WHERE pedido.estado = 'pendiente')",
        'pendientes',
      )
      .addSelect(
        "COUNT(*) FILTER (WHERE pedido.estado = 'en_preparacion')",
        'en_preparacion',
      )
      .addSelect("COUNT(*) FILTER (WHERE pedido.estado = 'listo')", 'listos')
      .addSelect(
        "COUNT(*) FILTER (WHERE pedido.estado = 'entregado')",
        'entregados',
      )
      .where('pedido.estado IN (:...estados)', {
        estados: [...ACTIVE_PEDIDO_ESTADOS],
      })
      .getRawOne<PedidosResumenRaw>();

    return {
      total: Number(raw?.total ?? 0),
      pendientes: Number(raw?.pendientes ?? 0),
      en_preparacion: Number(raw?.en_preparacion ?? 0),
      listos: Number(raw?.listos ?? 0),
      entregados: Number(raw?.entregados ?? 0),
    };
  }

  private async getUltimosPedidos(): Promise<DashboardPedidoRecienteData[]> {
    const rows = await this.pedidosRepository
      .createQueryBuilder('pedido')
      .leftJoin('pedido.mesa', 'mesa')
      .leftJoin('pedido.detalles', 'detalle')
      .select('pedido.id', 'id')
      .addSelect('mesa.numero', 'mesa')
      .addSelect('COALESCE(SUM(detalle.cantidad), 0)', 'items')
      .addSelect('pedido.total', 'total')
      .addSelect('pedido.estado', 'estado')
      .groupBy('pedido.id, mesa.id')
      .orderBy('pedido.fecha', 'DESC')
      .addOrderBy('pedido.id', 'DESC')
      .take(RECENT_ORDERS_LIMIT)
      .getRawMany<PedidoRecienteRaw>();

    return rows.map((row) => ({
      id: Number(row.id),
      mesa: Number(row.mesa),
      items: Number(row.items ?? 0),
      total: Number(row.total),
      estado: row.estado,
    }));
  }
}
