import { CajaResponseDto } from '../src/caja/dto/caja-response.dto.js';
import { MovimientoCajaResponseDto } from '../src/caja/dto/movimiento-caja-response.dto.js';
import { Caja } from '../src/caja/entities/caja.entity.js';
import { DashboardResumenResponseDto } from '../src/dashboard/dto/dashboard-resumen-response.dto.js';
import { Mesa } from '../src/mesas/entities/mesa.entity.js';
import { PagoResponseDto } from '../src/pagos/dto/pago-response.dto.js';
import { Pago } from '../src/pagos/entities/pago.entity.js';
import { DetallePedido } from '../src/pedidos/entities/detalle-pedido.entity.js';
import { Pedido } from '../src/pedidos/entities/pedido.entity.js';
import { PedidoResponseDto } from '../src/pedidos/dto/pedido-response.dto.js';
import { ProductoResponseDto } from '../src/productos/dto/producto-response.dto.js';
import { Producto } from '../src/productos/entities/producto.entity.js';
import { Usuario } from '../src/users/entities/usuario.entity.js';

const KNOWN_INSTANT = new Date('2026-10-19T16:45:00.000Z');

function parseJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function buildPedido(): Pedido {
  return Object.assign(new Pedido(), {
    id: 12,
    mesaId: 4,
    usuarioId: 2,
    estado: 'entregado',
    total: '12.50' as unknown as number,
    fecha: KNOWN_INSTANT,
    mesa: Object.assign(new Mesa(), { id: 4, numero: 4, estado: 'ocupada' }),
    usuario: Object.assign(new Usuario(), {
      id: 2,
      nombre: 'Valentín',
      email: 'valentin@example.com',
      rol: 'mozo',
      activo: true,
      passwordHash: 'secret',
    }),
    detalles: [
      Object.assign(new DetallePedido(), {
        id: 1,
        pedidoId: 12,
        productoId: 9,
        cantidad: 1,
        subtotal: '12.50' as unknown as number,
      }),
    ],
    pagos: [],
  });
}

function buildCaja(): Caja {
  return Object.assign(new Caja(), {
    id: 3,
    fechaApertura: KNOWN_INSTANT,
    fechaCierre: KNOWN_INSTANT,
    montoInicial: '10.00' as unknown as number,
    montoFinal: '15.00' as unknown as number,
    estado: 'cerrada',
  });
}

describe('Contrato arquitectónico de decimales en JSON', () => {
  it.each([
    [
      'productos.precio',
      () => {
        const dto = ProductoResponseDto.fromEntity(
          Object.assign(new Producto(), {
            id: 9,
            nombre: 'Café',
            descripcion: null,
            precio: '12.50',
            stock: 4,
            stockMinimo: 5,
            disponible: true,
            categoriaId: 1,
            categoria: { id: 1, nombre: 'Bebidas' },
          }),
        );
        return parseJson(dto).precio;
      },
    ],
    [
      'pedidos.total',
      () => parseJson(PedidoResponseDto.fromEntity(buildPedido())).total,
    ],
    [
      'detalle_pedido.subtotal',
      () =>
        parseJson(PedidoResponseDto.fromEntity(buildPedido())).detalles[0]
          ?.subtotal,
    ],
    [
      'pagos.monto',
      () => {
        const pago = Object.assign(new Pago(), {
          id: 5,
          pedidoId: 12,
          cajaId: 3,
          usuarioId: 2,
          metodoPago: 'efectivo',
          monto: '12.50' as unknown as number,
          fecha: KNOWN_INSTANT,
        });
        return parseJson(PagoResponseDto.fromEntity(pago)).monto;
      },
    ],
    [
      'caja.montos y ventas',
      () => {
        const dto = CajaResponseDto.fromEntity(buildCaja(), '2.50');
        const payload = parseJson(dto);
        return [
          payload.monto_inicial,
          payload.monto_final,
          payload.total_ventas,
        ];
      },
    ],
    [
      'movimientos.monto',
      () =>
        parseJson(
          MovimientoCajaResponseDto.fromProjection({
            id: 9,
            fecha: KNOWN_INSTANT,
            pedido_id: 12,
            mesa_numero: 4,
            monto: '12.50',
            metodo_pago: 'efectivo',
            usuario_nombre: 'Valentín',
          }),
        ).monto,
    ],
    [
      'dashboard.ventas_dia y pedido.total',
      () => {
        const dto = DashboardResumenResponseDto.fromData({
          ventasDia: { total: 12.5, pagos: 1 },
          mesas: { total: 1, libres: 0, ocupadas: 1, pendientes_cobro: 0 },
          pedidosActivos: {
            total: 1,
            pendientes: 0,
            en_preparacion: 0,
            listos: 0,
            entregados: 1,
          },
          caja: buildCaja(),
          ultimosPedidos: [
            {
              id: 12,
              mesa: 4,
              items: 1,
              total: '12.50' as unknown as number,
              estado: 'entregado',
            },
          ],
        });
        const payload = parseJson(dto);
        return [payload.ventas_dia.total, payload.ultimos_pedidos[0]?.total];
      },
    ],
  ])('serializa %s como number', (_name, getValues) => {
    const values = getValues();
    for (const value of Array.isArray(values) ? values : [values]) {
      expect(typeof value).toBe('number');
    }
  });
});
