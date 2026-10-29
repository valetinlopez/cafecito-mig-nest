import { PagoResponseDto } from './pago-response.dto.js';
import { Pago } from '../entities/pago.entity.js';

const KNOWN_INSTANT = new Date('2026-10-19T16:45:00.000Z');

function buildPago(overrides: Partial<Pago> = {}): Pago {
  return Object.assign(new Pago(), {
    id: 5,
    pedidoId: 12,
    cajaId: 3,
    usuarioId: 2,
    metodoPago: 'efectivo',
    monto: 950,
    fecha: KNOWN_INSTANT,
    ...overrides,
  });
}

describe('PagoResponseDto', () => {
  it('mapea la entity al shape del ticket', () => {
    const dto = PagoResponseDto.fromEntity(buildPago());

    expect(dto).toEqual({
      id: 5,
      pedido_id: 12,
      metodo_pago: 'efectivo',
      monto: 950,
      fecha: '2026-10-19T16:45:00.000Z',
    });
  });

  it('expone el monto como number, nunca como string', () => {
    const payload = JSON.parse(
      JSON.stringify(PagoResponseDto.fromEntity(buildPago())),
    ) as Record<string, unknown>;

    expect(typeof payload.monto).toBe('number');
    expect(payload.monto).toBe(950);
    expect(payload.monto).not.toBe('950.00');
  });

  it('serializa la fecha en ISO-8601 UTC con Z y milisegundos', () => {
    const dto = PagoResponseDto.fromEntity(buildPago());

    expect(dto.fecha).toBe('2026-10-19T16:45:00.000Z');
    expect(dto.fecha.endsWith('Z')).toBe(true);
  });

  it('no filtra claves internas del cobro', () => {
    const payload = PagoResponseDto.fromEntity(buildPago());

    expect(payload).not.toHaveProperty('caja_id');
    expect(payload).not.toHaveProperty('usuario_id');
    expect(payload).not.toHaveProperty('pedidoId');
    expect(payload).not.toHaveProperty('metodoPago');
  });

  it('preserva el método de pago tal cual viaja al front', () => {
    const dto = PagoResponseDto.fromEntity(
      buildPago({ metodoPago: 'mercado_pago' }),
    );

    expect(dto.metodo_pago).toBe('mercado_pago');
  });
});
