import { validate } from 'class-validator';
import { CajaAperturaDto } from './caja-apertura.dto.js';
import { CajaCierreDto } from './caja-cierre.dto.js';
import { CajaResponseDto } from './caja-response.dto.js';
import { MovimientoCajaResponseDto } from './movimiento-caja-response.dto.js';
import { Caja } from '../entities/caja.entity.js';

const KNOWN_INSTANT = new Date('2026-10-19T11:00:00.000Z');

function buildCaja(overrides: Partial<Caja> = {}): Caja {
  return Object.assign(new Caja(), {
    id: 1,
    fechaApertura: KNOWN_INSTANT,
    fechaCierre: null,
    montoInicial: 1000,
    montoFinal: null,
    estado: 'abierta',
    ...overrides,
  });
}

describe('Caja DTOs', () => {
  it('acepta solo monto_inicial numérico', async () => {
    const valid = Object.assign(new CajaAperturaDto(), { monto_inicial: 0 });
    const invalid = Object.assign(new CajaAperturaDto(), {
      monto_inicial: '1000',
    });

    await expect(validate(valid)).resolves.toHaveLength(0);
    await expect(validate(invalid)).resolves.not.toHaveLength(0);
  });

  it('acepta solo monto_final numérico', async () => {
    const valid = Object.assign(new CajaCierreDto(), { monto_final: 3500 });
    const invalid = Object.assign(new CajaCierreDto(), { monto_final: null });

    await expect(validate(valid)).resolves.toHaveLength(0);
    await expect(validate(invalid)).resolves.not.toHaveLength(0);
  });

  it('mapea la caja, fecha UTC, importes numéricos y ventas calculadas', () => {
    const dto = CajaResponseDto.fromEntity(buildCaja(), 2450.5);

    expect(dto).toEqual({
      id: 1,
      fecha_apertura: '2026-10-19T11:00:00.000Z',
      fecha_cierre: null,
      monto_inicial: 1000,
      monto_final: null,
      estado: 'abierta',
      total_ventas: 2450.5,
    });
    expect(JSON.stringify(dto)).not.toContain('totalVentas');
  });

  it('normaliza null de ventas a cero', () => {
    expect(CajaResponseDto.fromEntity(buildCaja(), null).total_ventas).toBe(0);
  });

  it('mapea el movimiento con usuario nullable al shape snake_case', () => {
    const dto = MovimientoCajaResponseDto.fromProjection({
      id: 7,
      fecha: KNOWN_INSTANT,
      pedido_id: 12,
      mesa_numero: 4,
      monto: 950,
      metodo_pago: 'efectivo',
      usuario_nombre: null,
    });

    expect(dto).toEqual({
      id: 7,
      fecha: '2026-10-19T11:00:00.000Z',
      pedido_id: 12,
      mesa_numero: 4,
      monto: 950,
      metodo_pago: 'efectivo',
      usuario_nombre: null,
    });
  });
});
