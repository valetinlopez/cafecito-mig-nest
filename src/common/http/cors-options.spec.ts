import { Logger } from '@nestjs/common';
import {
  DEFAULT_CORS_ORIGINS,
  buildCorsOptions,
  normalizeCorsOrigins,
} from './cors-options.js';
import { RESPONSE_TIME_HEADER } from './headers.js';

describe('normalizeCorsOrigins', () => {
  it('quita espacios, barras finales y entradas vacías', () => {
    expect(
      normalizeCorsOrigins([
        ' http://localhost:3000/ ',
        'https://app.cafecito.com///',
        '',
        '   ',
      ]),
    ).toEqual(['http://localhost:3000', 'https://app.cafecito.com']);
  });

  it('elimina duplicados conservando el orden', () => {
    expect(
      normalizeCorsOrigins([
        'https://app.cafecito.com',
        'http://localhost:3000',
        'https://app.cafecito.com/',
      ]),
    ).toEqual(['https://app.cafecito.com', 'http://localhost:3000']);
  });
});

describe('buildCorsOptions', () => {
  it('usa la lista configurada con credenciales', () => {
    const options = buildCorsOptions([
      'http://localhost:3000',
      'https://app.cafecito.com',
    ]);

    expect(options.origin).toEqual([
      'http://localhost:3000',
      'https://app.cafecito.com',
    ]);
    expect(options.credentials).toBe(true);
    expect(options.exposedHeaders).toContain(RESPONSE_TIME_HEADER);
  });

  it('cae en el default del legacy cuando no hay orígenes', () => {
    expect(buildCorsOptions([]).origin).toEqual([...DEFAULT_CORS_ORIGINS]);
  });

  it('refleja el origen del request cuando CORS_ORIGINS incluye "*"', () => {
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {
      /* silencio intencional: se verifica con el spy */
    });

    const options = buildCorsOptions(['*']);

    expect(options.origin).toBe(true);
    expect(options.credentials).toBe(true);
    expect(warn).toHaveBeenCalledOnce();

    warn.mockRestore();
  });

  it('incluye todos los métodos que usa el front', () => {
    expect(buildCorsOptions(['http://localhost:3000']).methods).toEqual(
      expect.arrayContaining([
        'GET',
        'POST',
        'PUT',
        'PATCH',
        'DELETE',
        'OPTIONS',
      ]),
    );
  });
});
