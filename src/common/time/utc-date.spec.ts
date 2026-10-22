import {
  formatUtcTimestamp,
  parseUtcTimestamp,
  toIsoUtc,
  toIsoUtcOrNull,
} from './utc-date.js';

/** Instante de referencia del ticket: 17:24 en Argentina (UTC-3). */
const KNOWN_INSTANT = new Date('2026-10-19T20:24:10.794Z');
const KNOWN_ISO = '2026-10-19T20:24:10.794Z';

describe('toIsoUtc', () => {
  it('serializa un instante conocido como ISO-8601 UTC con Z', () => {
    expect(toIsoUtc(KNOWN_INSTANT)).toBe(KNOWN_ISO);
  });

  it('conserva los milisegundos del instante', () => {
    const date = new Date(Date.UTC(2026, 9, 19, 20, 24, 10, 794));

    expect(toIsoUtc(date)).toBe(KNOWN_ISO);
  });

  it('produce un string que vuelve al mismo instante', () => {
    expect(new Date(toIsoUtc(KNOWN_INSTANT)).getTime()).toBe(
      KNOWN_INSTANT.getTime(),
    );
  });

  it('no depende de la zona horaria local del proceso', () => {
    const originalTimezone = process.env.TZ;

    try {
      process.env.TZ = 'America/Argentina/Buenos_Aires';

      expect(toIsoUtc(KNOWN_INSTANT)).toBe(KNOWN_ISO);
    } finally {
      if (originalTimezone === undefined) {
        delete process.env.TZ;
      } else {
        process.env.TZ = originalTimezone;
      }
    }
  });

  it('rechaza una fecha inválida', () => {
    expect(() => toIsoUtc(new Date('no-es-una-fecha'))).toThrow(
      'Fecha inválida',
    );
  });
});

describe('toIsoUtcOrNull', () => {
  it('normaliza null y undefined a null explícito', () => {
    expect(toIsoUtcOrNull(null)).toBeNull();
    expect(toIsoUtcOrNull(undefined)).toBeNull();
  });

  it('serializa la fecha cuando existe', () => {
    expect(toIsoUtcOrNull(KNOWN_INSTANT)).toBe(KNOWN_ISO);
  });
});

describe('formatUtcTimestamp', () => {
  it('escribe el literal de timestamp sin zona en UTC', () => {
    expect(formatUtcTimestamp(KNOWN_INSTANT)).toBe('2026-10-19 20:24:10.794');
  });

  it('completa los milisegundos a tres dígitos', () => {
    const date = new Date(Date.UTC(2026, 0, 2, 3, 4, 5));

    expect(formatUtcTimestamp(date)).toBe('2026-01-02 03:04:05.000');
  });

  it('usa los componentes UTC aunque el proceso esté en otra zona', () => {
    const originalTimezone = process.env.TZ;

    try {
      process.env.TZ = 'America/Argentina/Buenos_Aires';

      expect(formatUtcTimestamp(KNOWN_INSTANT)).toBe('2026-10-19 20:24:10.794');
    } finally {
      if (originalTimezone === undefined) {
        delete process.env.TZ;
      } else {
        process.env.TZ = originalTimezone;
      }
    }
  });
});

describe('parseUtcTimestamp', () => {
  it('interpreta el formato de PostgreSQL como UTC', () => {
    expect(parseUtcTimestamp('2026-10-19 20:24:10.794').toISOString()).toBe(
      KNOWN_ISO,
    );
  });

  it('acepta el separador ISO y fracciones de menos de tres dígitos', () => {
    expect(parseUtcTimestamp('2026-10-19T20:24:10.5').toISOString()).toBe(
      '2026-10-19T20:24:10.500Z',
    );
  });

  it('acepta microsegundos truncando a milisegundos', () => {
    expect(parseUtcTimestamp('2026-10-19 20:24:10.794321').toISOString()).toBe(
      KNOWN_ISO,
    );
  });

  it('respeta un offset explícito si el driver lo entrega', () => {
    expect(
      parseUtcTimestamp('2026-10-19T17:24:10.794-03:00').toISOString(),
    ).toBe(KNOWN_ISO);
  });

  it('sobrevive al round-trip con formatUtcTimestamp', () => {
    expect(parseUtcTimestamp(formatUtcTimestamp(KNOWN_INSTANT)).getTime()).toBe(
      KNOWN_INSTANT.getTime(),
    );
  });

  it('un pedido de las 17:24 en Argentina se muestra a las 17:24', () => {
    // El usuario crea el pedido a las 17:24 ART (UTC-3) = 20:24 UTC.
    const created = KNOWN_INSTANT;

    // Ciclo completo: escritura en PostgreSQL, lectura del driver y contrato.
    const stored = formatUtcTimestamp(created);
    const iso = toIsoUtc(parseUtcTimestamp(stored));

    const displayed = new Intl.DateTimeFormat('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(iso));

    expect(stored).toBe('2026-10-19 20:24:10.794');
    expect(displayed).toBe('17:24');
  });

  it('rechaza un timestamp con formato desconocido', () => {
    expect(() => parseUtcTimestamp('19/10/2026 20:24')).toThrow(
      'Timestamp inválido',
    );
  });

  it('rechaza un valor imposible', () => {
    expect(() => parseUtcTimestamp('2026-13-45 99:99:99')).toThrow(
      'Fecha inválida',
    );
  });

  it('rechaza un día que no existe en el mes', () => {
    expect(() => parseUtcTimestamp('2026-02-30 10:00:00')).toThrow(
      'Fecha inválida',
    );
  });
});
