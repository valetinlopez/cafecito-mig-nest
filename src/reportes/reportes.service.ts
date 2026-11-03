import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { Caja } from '../caja/entities/caja.entity.js';
import type { CajaEstado } from '../caja/estado-caja.js';
import { getBusinessDateRange } from '../common/time/business-timezone.js';
import { parseUtcTimestamp, toIsoUtc } from '../common/time/utc-date.js';
import { Pago } from '../pagos/entities/pago.entity.js';
import type { MetodoPago } from '../pagos/metodo-pago.js';
import { DetallePedido } from '../pedidos/entities/detalle-pedido.entity.js';
import { Pedido } from '../pedidos/entities/pedido.entity.js';
import type { ReporteVentasQueryDto } from './dto/reporte-ventas-query.dto.js';
import {
  ReporteVentasResponseDto,
  type ReporteCajaDetalleData,
  type ReporteMesaUtilizadaData,
  type ReporteProductoVendidoData,
  type ReporteResumenData,
  type ReporteVentaMetodoData,
} from './dto/reporte-ventas-response.dto.js';

/** El ticket MIG-37 fija el top de productos en 20 (D-07). */
const TOP_PRODUCTOS_LIMITE = 20;

/** Los importes del contrato son `numeric(10,2)`: dos decimales, como el legacy. */
const MONETARY_SCALE = 2;

const METODO_EFECTIVO: MetodoPago = 'efectivo';

const DESDE_POSTERIOR_A_HASTA =
  "La fecha 'desde' no puede ser posterior a 'hasta'";

interface ResumenRaw {
  total_vendido: number | string | null;
  cantidad_cobros: number | string | null;
  pedidos_cobrados: number | string | null;
}

interface VentaMetodoRaw {
  metodo_pago: MetodoPago;
  cantidad: number | string | null;
  total: number | string | null;
}

interface ProductoVendidoRaw {
  producto_id: number | string;
  nombre: string;
  cantidad: number | string | null;
  total: number | string | null;
}

interface MesaUtilizadaRaw {
  mesa_id: number | string;
  numero: number | string;
  cantidad_pedidos: number | string | null;
  total: number | string | null;
}

interface CajaDetalleRaw {
  caja_id: number | string;
  estado: CajaEstado;
  fecha_apertura: Date | string;
  fecha_cierre: Date | string | null;
  monto_inicial: number | string;
  monto_final: number | string | null;
  ventas_efectivo: number | string | null;
}

/**
 * Reporte de ventas por período (MIG-37).
 *
 * Es de **solo lectura** y la consulta más pesada del sistema: cada bloque se
 * agrega en SQL y los cinco corren en paralelo (D-02). El eje del período es
 * `pagos.fecha`, interpretado en la zona del negocio y consultado en UTC
 * (D-01): un pedido cuenta como vendido si tiene un cobro dentro del rango.
 *
 * El service no conoce HTTP más allá de los códigos de negocio: `desde > hasta`
 * es un `400` del contrato, no un error de validación de formato (ese lo
 * resuelve el DTO con `422`).
 */
@Injectable()
export class ReportesService {
  constructor(
    @InjectRepository(Pago)
    private readonly pagosRepository: Repository<Pago>,
    @InjectRepository(Pedido)
    private readonly pedidosRepository: Repository<Pedido>,
    @InjectRepository(DetallePedido)
    private readonly detallesRepository: Repository<DetallePedido>,
    @InjectRepository(Caja)
    private readonly cajasRepository: Repository<Caja>,
  ) {}

  async getReporteVentas(
    filtro: ReporteVentasQueryDto,
  ): Promise<ReporteVentasResponseDto> {
    if (filtro.desde > filtro.hasta) {
      throw new BadRequestException(DESDE_POSTERIOR_A_HASTA);
    }

    const { start, end } = getBusinessDateRange(filtro.desde, filtro.hasta);

    const [resumen, ventasPorMetodo, productos, mesas, cajas] =
      await Promise.all([
        this.getResumen(start, end),
        this.getVentasPorMetodo(start, end),
        this.getProductosMasVendidos(start, end),
        this.getMesasUtilizadas(start, end),
        this.getCajas(start, end),
      ]);

    return ReporteVentasResponseDto.fromData({
      desde: filtro.desde,
      hasta: filtro.hasta,
      resumen,
      ventas_por_metodo: ventasPorMetodo,
      productos_mas_vendidos: productos,
      mesas_utilizadas: mesas,
      cajas,
    });
  }

  private async getResumen(
    start: Date,
    end: Date,
  ): Promise<ReporteResumenData> {
    const raw = await this.pagosRepository
      .createQueryBuilder('pago')
      .select('COALESCE(SUM(pago.monto), 0)', 'total_vendido')
      .addSelect('COUNT(pago.id)', 'cantidad_cobros')
      .addSelect('COUNT(DISTINCT pago.pedidoId)', 'pedidos_cobrados')
      .where('pago.fecha >= :start AND pago.fecha < :end', { start, end })
      .getRawOne<ResumenRaw>();

    const totalVendido = Number(raw?.total_vendido ?? 0);
    const cantidadCobros = Number(raw?.cantidad_cobros ?? 0);

    return {
      total_vendido: roundMoney(totalVendido),
      cantidad_cobros: cantidadCobros,
      pedidos_cobrados: Number(raw?.pedidos_cobrados ?? 0),
      ticket_promedio:
        cantidadCobros === 0 ? 0 : roundMoney(totalVendido / cantidadCobros),
    };
  }

  private async getVentasPorMetodo(
    start: Date,
    end: Date,
  ): Promise<ReporteVentaMetodoData[]> {
    const rows = await this.pagosRepository
      .createQueryBuilder('pago')
      .select('pago.metodoPago', 'metodo_pago')
      .addSelect('COUNT(pago.id)', 'cantidad')
      .addSelect('COALESCE(SUM(pago.monto), 0)', 'total')
      .where('pago.fecha >= :start AND pago.fecha < :end', { start, end })
      .groupBy('pago.metodoPago')
      .orderBy('total', 'DESC')
      .addOrderBy('pago.metodoPago', 'ASC')
      .getRawMany<VentaMetodoRaw>();

    return rows.map((row) => ({
      metodo_pago: row.metodo_pago,
      cantidad: Number(row.cantidad ?? 0),
      total: roundMoney(Number(row.total ?? 0)),
    }));
  }

  private async getProductosMasVendidos(
    start: Date,
    end: Date,
  ): Promise<ReporteProductoVendidoData[]> {
    const rows = await this.detallesRepository
      .createQueryBuilder('detalle')
      .innerJoin('detalle.pedido', 'pedido')
      .innerJoin('pedido.pagos', 'pago')
      .innerJoin('detalle.producto', 'producto')
      .select('producto.id', 'producto_id')
      .addSelect('producto.nombre', 'nombre')
      .addSelect('SUM(detalle.cantidad)', 'cantidad')
      .addSelect('COALESCE(SUM(detalle.subtotal), 0)', 'total')
      .where('pago.fecha >= :start AND pago.fecha < :end', { start, end })
      .groupBy('producto.id')
      .addGroupBy('producto.nombre')
      .orderBy('cantidad', 'DESC')
      .addOrderBy('producto.nombre', 'ASC')
      .limit(TOP_PRODUCTOS_LIMITE)
      .getRawMany<ProductoVendidoRaw>();

    return rows.map((row) => ({
      producto_id: Number(row.producto_id),
      nombre: row.nombre,
      cantidad: Number(row.cantidad ?? 0),
      total: roundMoney(Number(row.total ?? 0)),
    }));
  }

  private async getMesasUtilizadas(
    start: Date,
    end: Date,
  ): Promise<ReporteMesaUtilizadaData[]> {
    const rows = await this.pedidosRepository
      .createQueryBuilder('pedido')
      .innerJoin('pedido.mesa', 'mesa')
      .innerJoin('pedido.pagos', 'pago')
      .select('mesa.id', 'mesa_id')
      .addSelect('mesa.numero', 'numero')
      .addSelect('COUNT(DISTINCT pedido.id)', 'cantidad_pedidos')
      .addSelect('COALESCE(SUM(pedido.total), 0)', 'total')
      .where('pago.fecha >= :start AND pago.fecha < :end', { start, end })
      .groupBy('mesa.id')
      .addGroupBy('mesa.numero')
      .orderBy('cantidad_pedidos', 'DESC')
      .addOrderBy('mesa.numero', 'ASC')
      .getRawMany<MesaUtilizadaRaw>();

    return rows.map((row) => ({
      mesa_id: Number(row.mesa_id),
      numero: Number(row.numero),
      cantidad_pedidos: Number(row.cantidad_pedidos ?? 0),
      total: roundMoney(Number(row.total ?? 0)),
    }));
  }

  /**
   * Cajas que intersectan el período, con el efectivo cobrado en toda su vida.
   *
   * `ventas_efectivo` no se limita al rango: la `diferencia` de cierre compara
   * el `monto_final` contra todo lo que entró en efectivo durante el turno
   * (D-05). Una caja cerrada antes del inicio del rango no intersecta y se
   * excluye.
   */
  private async getCajas(
    start: Date,
    end: Date,
  ): Promise<ReporteCajaDetalleData[]> {
    const rows = await this.cajasRepository
      .createQueryBuilder('caja')
      .leftJoin(Pago, 'pago', 'pago.cajaId = caja.id')
      .select('caja.id', 'caja_id')
      .addSelect('caja.estado', 'estado')
      .addSelect('caja.fechaApertura', 'fecha_apertura')
      .addSelect('caja.fechaCierre', 'fecha_cierre')
      .addSelect('caja.montoInicial', 'monto_inicial')
      .addSelect('caja.montoFinal', 'monto_final')
      .addSelect(
        'COALESCE(SUM(CASE WHEN pago.metodoPago = :metodoEfectivo THEN pago.monto ELSE 0 END), 0)',
        'ventas_efectivo',
      )
      .where('caja.fechaApertura < :end', { end })
      .andWhere('(caja.fechaCierre IS NULL OR caja.fechaCierre >= :start)', {
        start,
      })
      .setParameter('metodoEfectivo', METODO_EFECTIVO)
      .groupBy('caja.id')
      .orderBy('caja.fechaApertura', 'ASC')
      .addOrderBy('caja.id', 'ASC')
      .getRawMany<CajaDetalleRaw>();

    return rows.map((row) => {
      const montoInicial = Number(row.monto_inicial);
      const ventasEfectivo = Number(row.ventas_efectivo ?? 0);
      const montoFinal =
        row.monto_final === null ? null : Number(row.monto_final);

      return {
        caja_id: Number(row.caja_id),
        estado: row.estado,
        fecha_apertura: toIsoUtcFromRaw(row.fecha_apertura),
        fecha_cierre: toIsoUtcOrNullFromRaw(row.fecha_cierre),
        monto_inicial: roundMoney(montoInicial),
        ventas_efectivo: roundMoney(ventasEfectivo),
        monto_final: montoFinal === null ? null : roundMoney(montoFinal),
        diferencia:
          montoFinal === null
            ? null
            : roundMoney(montoFinal - (montoInicial + ventasEfectivo)),
      };
    });
  }
}

/** Redondea a los dos decimales del contrato para evitar ruido de coma flotante. */
function roundMoney(value: number): number {
  return Number(value.toFixed(MONETARY_SCALE));
}

/**
 * Las consultas crudas no pasan por `utcTimestampTransformer`: `pg` puede
 * devolver `Date` o el literal `YYYY-MM-DD HH:MM:SS`, así que se normaliza acá.
 */
function toIsoUtcFromRaw(value: Date | string): string {
  return toIsoUtc(value instanceof Date ? value : parseUtcTimestamp(value));
}

function toIsoUtcOrNullFromRaw(value: Date | string | null): string | null {
  return value === null ? null : toIsoUtcFromRaw(value);
}
