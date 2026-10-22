import { utcTimestampTransformer } from './utc-timestamp.transformer.js';

const KNOWN_INSTANT = new Date('2026-10-19T20:24:10.794Z');

interface TypedTransformer {
  to(value: Date | null | undefined): string | null | undefined;
  from(value: Date | string | null | undefined): Date | null | undefined;
}

/**
 * Vista tipada del transformer: `ValueTransformer` declara `any` y usarlo
 * directo en los asserts dispara las reglas `no-unsafe-*` de ESLint.
 */
const transformer: TypedTransformer = utcTimestampTransformer;

describe('utcTimestampTransformer', () => {
  it('escribe el instante como literal UTC sin zona', () => {
    expect(transformer.to(KNOWN_INSTANT)).toBe('2026-10-19 20:24:10.794');
  });

  it('deja pasar null y undefined en la escritura', () => {
    expect(transformer.to(null)).toBeNull();
    expect(transformer.to(undefined)).toBeUndefined();
  });

  it('rechaza una fecha inválida al escribir', () => {
    expect(() => transformer.to(new Date('no-es-fecha'))).toThrow(
      'Fecha inválida',
    );
  });

  it('interpreta como UTC un timestamp que llega como string', () => {
    expect(transformer.from('2026-10-19 20:24:10.794')?.toISOString()).toBe(
      '2026-10-19T20:24:10.794Z',
    );
  });

  it('devuelve el mismo Date cuando el driver ya lo convirtió', () => {
    expect(transformer.from(KNOWN_INSTANT)).toBe(KNOWN_INSTANT);
  });

  it('deja pasar null y undefined en la lectura', () => {
    expect(transformer.from(null)).toBeNull();
    expect(transformer.from(undefined)).toBeUndefined();
  });

  it('rechaza un valor de base con formato desconocido', () => {
    expect(() => transformer.from('ayer')).toThrow('Timestamp inválido');
  });
});
