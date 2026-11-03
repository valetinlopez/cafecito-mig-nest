import {
  BUSINESS_TIME_ZONE,
  businessDateToUtc,
  getBusinessDateParts,
  getBusinessDateRange,
  getBusinessDayRange,
  nextDay,
  parseBusinessDate,
} from './business-timezone.js';

describe('business-timezone', () => {
  it('usa la zona de negocio de Argentina', () => {
    expect(BUSINESS_TIME_ZONE).toBe('America/Argentina/Buenos_Aires');
  });

  it('calcula el día de negocio como intervalo semiabierto en UTC', () => {
    const range = getBusinessDayRange(new Date('2026-10-19T15:00:00.000Z'));

    expect(range.start.toISOString()).toBe('2026-10-19T03:00:00.000Z');
    expect(range.end.toISOString()).toBe('2026-10-20T03:00:00.000Z');
  });

  it('mantiene el día local aunque en UTC ya sea el día siguiente', () => {
    // 2026-10-20T02:30Z son las 23:30 del 19 en Buenos Aires.
    const range = getBusinessDayRange(new Date('2026-10-20T02:30:00.000Z'));

    expect(range.start.toISOString()).toBe('2026-10-19T03:00:00.000Z');
    expect(range.end.toISOString()).toBe('2026-10-20T03:00:00.000Z');
  });

  it('convierte un período inclusivo al rango UTC del día siguiente exclusivo', () => {
    const range = getBusinessDateRange('2026-10-01', '2026-10-19');

    expect(range.start.toISOString()).toBe('2026-10-01T03:00:00.000Z');
    expect(range.end.toISOString()).toBe('2026-10-20T03:00:00.000Z');
  });

  it('acepta un período de un solo día', () => {
    const range = getBusinessDateRange('2026-10-19', '2026-10-19');

    expect(range.start.toISOString()).toBe('2026-10-19T03:00:00.000Z');
    expect(range.end.toISOString()).toBe('2026-10-20T03:00:00.000Z');
  });

  it('rechaza formatos que no son YYYY-MM-DD', () => {
    expect(() => parseBusinessDate('01-10-2026')).toThrow(TypeError);
    expect(() => parseBusinessDate('2026-10-01T00:00:00Z')).toThrow(TypeError);
    expect(() => parseBusinessDate('')).toThrow(TypeError);
  });

  it('rechaza fechas que no existen en el calendario', () => {
    expect(() => parseBusinessDate('2026-02-30')).toThrow(TypeError);
    expect(() => parseBusinessDate('2026-13-01')).toThrow(TypeError);
  });

  it('avanza al día siguiente resolviendo fin de mes y de año', () => {
    expect(nextDay({ year: 2026, month: 12, day: 31 })).toEqual({
      year: 2027,
      month: 1,
      day: 1,
    });
    expect(nextDay({ year: 2026, month: 2, day: 28 })).toEqual({
      year: 2026,
      month: 3,
      day: 1,
    });
  });

  it('obtiene la fecha del negocio de un instante y su medianoche UTC', () => {
    const parts = getBusinessDateParts(new Date('2026-10-20T02:30:00.000Z'));

    expect(parts).toEqual({ year: 2026, month: 10, day: 19 });
    expect(businessDateToUtc(parts).toISOString()).toBe(
      '2026-10-19T03:00:00.000Z',
    );
  });

  it('falla con un Date inválido en lugar de devolver basura', () => {
    expect(() => getBusinessDateParts(new Date('no-es-fecha'))).toThrow(
      TypeError,
    );
  });
});
