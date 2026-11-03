import { ApiProperty } from '@nestjs/swagger';
import { CAJA_ESTADOS } from '../../caja/estado-caja.js';
import type { CajaEstado } from '../../caja/estado-caja.js';
import type { MetodoPago } from '../../pagos/metodo-pago.js';

/**
 * Proyecciones internas del reporte.
 *
 * Los nombres son los del contrato (`snake_case`) a propósito: el service
 * agrega en SQL con esos alias y el DTO solo los ensambla. Un mapeo intermedio
 * a camelCase agregaría una traducción que nadie consume.
 */
export interface ReporteResumenData {
  total_vendido: number;
  cantidad_cobros: number;
  pedidos_cobrados: number;
  ticket_promedio: number;
}

export interface ReporteVentaMetodoData {
  metodo_pago: MetodoPago;
  cantidad: number;
  total: number;
}

export interface ReporteProductoVendidoData {
  producto_id: number;
  nombre: string;
  cantidad: number;
  total: number;
}

export interface ReporteMesaUtilizadaData {
  mesa_id: number;
  numero: number;
  cantidad_pedidos: number;
  total: number;
}

export interface ReporteCajaDetalleData {
  caja_id: number;
  estado: CajaEstado;
  fecha_apertura: string;
  fecha_cierre: string | null;
  monto_inicial: number;
  ventas_efectivo: number;
  monto_final: number | null;
  diferencia: number | null;
}

/** Datos completos del reporte antes de instanciar los DTOs. */
export interface ReporteVentasData {
  desde: string;
  hasta: string;
  resumen: ReporteResumenData;
  ventas_por_metodo: ReporteVentaMetodoData[];
  productos_mas_vendidos: ReporteProductoVendidoData[];
  mesas_utilizadas: ReporteMesaUtilizadaData[];
  cajas: ReporteCajaDetalleData[];
}

export class ReportePeriodoDto {
  @ApiProperty({ example: '2026-10-01', type: String, format: 'date' })
  desde!: string;

  @ApiProperty({ example: '2026-10-19', type: String, format: 'date' })
  hasta!: string;
}

export class ReporteResumenDto {
  @ApiProperty({ example: 125000, type: Number })
  total_vendido!: number;

  @ApiProperty({ example: 84, type: Number })
  cantidad_cobros!: number;

  @ApiProperty({ example: 80, type: Number })
  pedidos_cobrados!: number;

  @ApiProperty({
    example: 1562.5,
    type: Number,
    description: 'total_vendido / cantidad_cobros; 0 si no hay cobros.',
  })
  ticket_promedio!: number;
}

export class ReporteVentaMetodoDto {
  @ApiProperty({ example: 'efectivo' })
  metodo_pago!: MetodoPago;

  @ApiProperty({ example: 40, type: Number })
  cantidad!: number;

  @ApiProperty({ example: 60000, type: Number })
  total!: number;
}

export class ReporteProductoVendidoDto {
  @ApiProperty({ example: 1, type: Number })
  producto_id!: number;

  @ApiProperty({ example: 'Café con leche' })
  nombre!: string;

  @ApiProperty({ example: 120, type: Number })
  cantidad!: number;

  @ApiProperty({ example: 102000, type: Number })
  total!: number;
}

export class ReporteMesaUtilizadaDto {
  @ApiProperty({ example: 1, type: Number })
  mesa_id!: number;

  @ApiProperty({ example: 1, type: Number })
  numero!: number;

  @ApiProperty({ example: 18, type: Number })
  cantidad_pedidos!: number;

  @ApiProperty({ example: 27000, type: Number })
  total!: number;
}

export class ReporteCajaDetalleDto {
  @ApiProperty({ example: 1, type: Number })
  caja_id!: number;

  @ApiProperty({ enum: [...CAJA_ESTADOS], example: 'cerrada' })
  estado!: CajaEstado;

  @ApiProperty({
    example: '2026-10-18T11:00:00.000Z',
    type: String,
    description: 'ISO-8601 UTC con sufijo Z (ADR 0007).',
  })
  fecha_apertura!: string;

  @ApiProperty({
    example: '2026-10-18T23:00:00.000Z',
    type: String,
    nullable: true,
    description: 'ISO-8601 UTC con sufijo Z, o null si sigue abierta.',
  })
  fecha_cierre!: string | null;

  @ApiProperty({ example: 1000, type: Number })
  monto_inicial!: number;

  @ApiProperty({
    example: 40000,
    type: Number,
    description: 'Cobros en efectivo de la caja; no se limita al período.',
  })
  ventas_efectivo!: number;

  @ApiProperty({ example: 41500, type: Number, nullable: true })
  monto_final!: number | null;

  @ApiProperty({
    example: 500,
    type: Number,
    nullable: true,
    description:
      'monto_final - (monto_inicial + ventas_efectivo); null si la caja sigue abierta.',
  })
  diferencia!: number | null;
}

export class ReporteVentasResponseDto {
  @ApiProperty({ type: ReportePeriodoDto })
  periodo!: ReportePeriodoDto;

  @ApiProperty({ type: ReporteResumenDto })
  resumen!: ReporteResumenDto;

  @ApiProperty({ type: [ReporteVentaMetodoDto] })
  ventas_por_metodo!: ReporteVentaMetodoDto[];

  @ApiProperty({ type: [ReporteProductoVendidoDto] })
  productos_mas_vendidos!: ReporteProductoVendidoDto[];

  @ApiProperty({ type: [ReporteMesaUtilizadaDto] })
  mesas_utilizadas!: ReporteMesaUtilizadaDto[];

  @ApiProperty({ type: [ReporteCajaDetalleDto] })
  cajas!: ReporteCajaDetalleDto[];

  static fromData(data: ReporteVentasData): ReporteVentasResponseDto {
    const dto = new ReporteVentasResponseDto();
    dto.periodo = { desde: data.desde, hasta: data.hasta };
    dto.resumen = { ...data.resumen };
    dto.ventas_por_metodo = data.ventas_por_metodo.map((item) => ({
      ...item,
    }));
    dto.productos_mas_vendidos = data.productos_mas_vendidos.map((item) => ({
      ...item,
    }));
    dto.mesas_utilizadas = data.mesas_utilizadas.map((item) => ({ ...item }));
    dto.cajas = data.cajas.map((item) => ({ ...item }));
    return dto;
  }
}
