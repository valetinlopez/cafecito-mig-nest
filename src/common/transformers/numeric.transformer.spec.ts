import { numericTransformer } from './numeric.transformer.js';

interface TypedTransformer {
  to(value: number | null | undefined): number | null | undefined;
  from(value: string | null | undefined): number | null | undefined;
}

/**
 * Vista tipada del transformer: `ValueTransformer` declara `any` y usarlo
 * directo en los asserts dispara las reglas `no-unsafe-*` de ESLint.
 */
const transformer: TypedTransformer = numericTransformer;

describe('numericTransformer', () => {
  it('convierte el string de PostgreSQL en number', () => {
    expect(transformer.from('850.00')).toBe(850);
    expect(transformer.from('1488.10')).toBe(1488.1);
    expect(typeof transformer.from('0.00')).toBe('number');
  });

  it('convierte cero sin perderlo', () => {
    expect(transformer.from('0.00')).toBe(0);
  });

  it('nunca devuelve NaN para un decimal válido', () => {
    expect(Number.isNaN(transformer.from('1234567.89'))).toBe(false);
  });

  it('deja pasar null y undefined en la lectura', () => {
    expect(transformer.from(null)).toBeNull();
    expect(transformer.from(undefined)).toBeUndefined();
  });

  it('escribe el número tal cual, sin volverlo string', () => {
    expect(transformer.to(950.5)).toBe(950.5);
    expect(transformer.to(0)).toBe(0);
  });

  it('deja pasar null y undefined en la escritura', () => {
    expect(transformer.to(null)).toBeNull();
    expect(transformer.to(undefined)).toBeUndefined();
  });
});
