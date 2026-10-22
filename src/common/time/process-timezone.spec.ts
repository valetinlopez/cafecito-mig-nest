import { Logger } from '@nestjs/common';
import { pinProcessTimezone, UTC_TIME_ZONE } from './process-timezone.js';

describe('pinProcessTimezone', () => {
  const originalTimezone = process.env.TZ;

  afterEach(() => {
    if (originalTimezone === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = originalTimezone;
    }

    vi.restoreAllMocks();
  });

  it('fija el proceso en UTC aunque el sistema esté en otra zona', () => {
    process.env.TZ = 'America/Argentina/Buenos_Aires';

    pinProcessTimezone();

    expect(process.env.TZ).toBe(UTC_TIME_ZONE);
    expect(new Date(2026, 9, 19, 20, 24, 10).toISOString()).toBe(
      '2026-10-19T20:24:10.000Z',
    );
    expect(new Date('2026-10-19T20:24:10.000Z').getHours()).toBe(20);
  });

  it('leer un timestamp sin zona como UTC deja la hora intacta', () => {
    pinProcessTimezone();

    expect(new Date(2026, 9, 19, 20, 24, 10).toISOString()).toBe(
      '2026-10-19T20:24:10.000Z',
    );
  });

  it('es idempotente y no advierte si ya estaba en UTC', () => {
    pinProcessTimezone();
    const warn = vi.spyOn(Logger.prototype, 'warn');

    pinProcessTimezone();

    expect(warn).not.toHaveBeenCalled();
  });

  it('advierte cuando reemplaza una zona distinta a UTC', () => {
    const warn = vi
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    process.env.TZ = 'America/Argentina/Buenos_Aires';

    pinProcessTimezone();

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('America/Argentina/Buenos_Aires'),
    );
  });

  it('falla el arranque si el runtime no aplica UTC', () => {
    vi.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(-180);

    expect(() => pinProcessTimezone()).toThrow(
      'No se pudo fijar la zona horaria del proceso en UTC',
    );
  });
});
