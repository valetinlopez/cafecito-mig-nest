import { Mesa } from '../../mesas/entities/mesa.entity.js';
import { Usuario } from '../../users/entities/usuario.entity.js';
import { DetallePedido } from '../entities/detalle-pedido.entity.js';
import { Pedido } from '../entities/pedido.entity.js';
import { PedidoResponseDto } from './pedido-response.dto.js';

const KNOWN_INSTANT = new Date('2026-10-19T20:24:10.000Z');

function buildDetalle(overrides: Partial<DetallePedido> = {}): DetallePedido {
  return Object.assign(new DetallePedido(), {
    id: 1,
    pedidoId: 10,
    productoId: 1,
    cantidad: 2,
    subtotal: 300,
    ...overrides,
  });
}

function buildPedido(overrides: Partial<Pedido> = {}): Pedido {
  return Object.assign(new Pedido(), {
    id: 10,
    mesaId: 1,
    usuarioId: 2,
    estado: 'pendiente',
    total: 300,
    fecha: KNOWN_INSTANT,
    mesa: Object.assign(new Mesa(), { id: 1, numero: 5, estado: 'ocupada' }),
    usuario: Object.assign(new Usuario(), {
      id: 2,
      nombre: 'Valentín',
      email: 'valentin@example.com',
      passwordHash: 'hash-que-no-debe-salir',
      rol: 'mozo',
      activo: true,
    }),
    detalles: [buildDetalle()],
    pagos: [],
    ...overrides,
  });
}

describe('PedidoResponseDto', () => {
  it('mapea la entity al shape del contrato', () => {
    const dto = PedidoResponseDto.fromEntity(buildPedido());

    expect(dto).toEqual({
      id: 10,
      estado: 'pendiente',
      total: 300,
      fecha: '2026-10-19T20:24:10.000Z',
      mesa: { id: 1, numero: 5, estado: 'ocupada' },
      usuario: {
        id: 2,
        nombre: 'Valentín',
        email: 'valentin@example.com',
        rol: 'mozo',
        activo: true,
      },
      detalles: [{ id: 1, producto_id: 1, cantidad: 2, subtotal: 300 }],
    });
  });

  it('expone total y subtotal como number, nunca como string', () => {
    const dto = PedidoResponseDto.fromEntity(
      buildPedido({
        total: '300.00' as unknown as number,
        detalles: [buildDetalle({ subtotal: '300.00' as unknown as number })],
      }),
    );
    const payload = JSON.parse(JSON.stringify(dto)) as Record<string, unknown>;

    expect(typeof payload.total).toBe('number');
    expect(typeof dto.detalles[0]?.subtotal).toBe('number');
    expect(payload.total).toBe(300);
    expect(dto.detalles[0]?.subtotal).toBe(300);
  });

  it('serializa la fecha en ISO-8601 UTC con Z y milisegundos', () => {
    const dto = PedidoResponseDto.fromEntity(buildPedido());

    expect(dto.fecha).toBe('2026-10-19T20:24:10.000Z');
    expect(dto.fecha.endsWith('Z')).toBe(true);
  });

  it('no expone columnas internas ni el hash del usuario', () => {
    const payload = JSON.parse(
      JSON.stringify(PedidoResponseDto.fromEntity(buildPedido())),
    ) as Record<string, unknown>;

    expect(payload).not.toHaveProperty('mesa_id');
    expect(payload).not.toHaveProperty('usuario_id');
    expect(payload).not.toHaveProperty('pagos');
    expect(JSON.stringify(payload)).not.toContain('password_hash');
    expect(JSON.stringify(payload)).not.toContain('hash-que-no-debe-salir');
  });

  it('conserva el orden de los detalles', () => {
    const dto = PedidoResponseDto.fromEntity(
      buildPedido({
        detalles: [
          buildDetalle({ id: 1, productoId: 1 }),
          buildDetalle({ id: 2, productoId: 7, cantidad: 1, subtotal: 150 }),
        ],
      }),
    );

    expect(dto.detalles.map((detalle) => detalle.producto_id)).toEqual([1, 7]);
  });

  it('falla si falta la mesa hidratada', () => {
    const pedido = buildPedido({ mesa: undefined as unknown as Mesa });

    expect(() => PedidoResponseDto.fromEntity(pedido)).toThrow(
      'Pedido sin mesa hidratada',
    );
  });

  it('falla si falta el usuario hidratado', () => {
    const pedido = buildPedido({ usuario: undefined as unknown as Usuario });

    expect(() => PedidoResponseDto.fromEntity(pedido)).toThrow(
      'Pedido sin usuario hidratado',
    );
  });

  it('falla si faltan los detalles hidratados', () => {
    const pedido = buildPedido({
      detalles: undefined as unknown as DetallePedido[],
    });

    expect(() => PedidoResponseDto.fromEntity(pedido)).toThrow(
      'Pedido sin detalles hidratados',
    );
  });
});
