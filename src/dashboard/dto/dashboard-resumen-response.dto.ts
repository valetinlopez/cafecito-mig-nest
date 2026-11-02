import { ApiProperty } from '@nestjs/swagger';
import { toIsoUtc } from '../../common/time/utc-date.js';
import { PEDIDO_ESTADOS } from '../../pedidos/pedido-estado.js';
import type { PedidoEstado } from '../../pedidos/pedido-estado.js';
import type { Caja } from '../../caja/entities/caja.entity.js';

export interface DashboardVentasDiaData {
  total: number;
  pagos: number;
}

export interface DashboardMesasData {
  total: number;
  libres: number;
  ocupadas: number;
  pendientes_cobro: number;
}

export interface DashboardPedidosActivosData {
  total: number;
  pendientes: number;
  en_preparacion: number;
  listos: number;
  entregados: number;
}

export interface DashboardPedidoRecienteData {
  id: number;
  mesa: number;
  items: number;
  total: number;
  estado: PedidoEstado;
}

export class DashboardVentasDiaDto {
  @ApiProperty({ type: Number, example: 12500 })
  total!: number;

  @ApiProperty({ type: Number, example: 8 })
  pagos!: number;
}

export class DashboardMesasDto {
  @ApiProperty({ type: Number, example: 12 })
  total!: number;

  @ApiProperty({ type: Number, example: 5 })
  libres!: number;

  @ApiProperty({ type: Number, example: 4 })
  ocupadas!: number;

  @ApiProperty({ type: Number, example: 3 })
  pendientes_cobro!: number;
}

export class DashboardPedidosActivosDto {
  @ApiProperty({ type: Number, example: 7 })
  total!: number;

  @ApiProperty({ type: Number, example: 2 })
  pendientes!: number;

  @ApiProperty({ type: Number, example: 2 })
  en_preparacion!: number;

  @ApiProperty({ type: Number, example: 1 })
  listos!: number;

  @ApiProperty({ type: Number, example: 2 })
  entregados!: number;
}

export class DashboardCajaDto {
  @ApiProperty({ example: 'abierta' })
  estado!: string;

  @ApiProperty({ type: Number, nullable: true, example: 5000 })
  monto_inicial!: number | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example: '2026-10-19T11:00:00.000Z',
  })
  fecha_apertura!: string | null;
}

export class DashboardPedidoRecienteDto {
  @ApiProperty({ type: Number })
  id!: number;

  @ApiProperty({ type: Number, description: 'Número de mesa' })
  mesa!: number;

  @ApiProperty({ type: Number, description: 'Suma de cantidades del pedido' })
  items!: number;

  @ApiProperty({ type: Number })
  total!: number;

  @ApiProperty({ enum: PEDIDO_ESTADOS })
  estado!: PedidoEstado;
}

export class DashboardResumenResponseDto {
  @ApiProperty({ type: DashboardVentasDiaDto })
  ventas_dia!: DashboardVentasDiaDto;

  @ApiProperty({ type: DashboardMesasDto })
  mesas!: DashboardMesasDto;

  @ApiProperty({ type: DashboardPedidosActivosDto })
  pedidos_activos!: DashboardPedidosActivosDto;

  @ApiProperty({ type: DashboardCajaDto })
  caja!: DashboardCajaDto;

  @ApiProperty({ type: [DashboardPedidoRecienteDto] })
  ultimos_pedidos!: DashboardPedidoRecienteDto[];

  static fromData(input: {
    ventasDia: DashboardVentasDiaData;
    mesas: DashboardMesasData;
    pedidosActivos: DashboardPedidosActivosData;
    caja: Caja | null;
    ultimosPedidos: DashboardPedidoRecienteData[];
  }): DashboardResumenResponseDto {
    const dto = new DashboardResumenResponseDto();
    dto.ventas_dia = { ...input.ventasDia };
    dto.mesas = { ...input.mesas };
    dto.pedidos_activos = { ...input.pedidosActivos };
    dto.caja =
      input.caja === null
        ? { estado: 'cerrada', monto_inicial: null, fecha_apertura: null }
        : {
            estado: input.caja.estado,
            monto_inicial: Number(input.caja.montoInicial),
            fecha_apertura: toIsoUtc(input.caja.fechaApertura),
          };
    dto.ultimos_pedidos = input.ultimosPedidos.map((pedido) => ({
      ...pedido,
      total: Number(pedido.total),
    }));
    return dto;
  }
}