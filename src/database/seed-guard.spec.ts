import { assertSeedAllowed } from './seed-guard.js';

describe('assertSeedAllowed', () => {
  it('permite ejecutar fuera de producción', () => {
    expect(() => assertSeedAllowed({ NODE_ENV: 'development' })).not.toThrow();
    expect(() => assertSeedAllowed({ NODE_ENV: 'test' })).not.toThrow();
  });

  it('bloquea producción sin confirmación explícita', () => {
    expect(() => assertSeedAllowed({ NODE_ENV: 'production' })).toThrow(
      'El seed está bloqueado en producción',
    );
  });

  it('permite producción con SEED_ALLOW_PRODUCTION=true', () => {
    expect(() =>
      assertSeedAllowed({
        NODE_ENV: 'production',
        SEED_ALLOW_PRODUCTION: 'true',
      }),
    ).not.toThrow();
  });

  it('no acepta valores distintos de "true" como confirmación', () => {
    expect(() =>
      assertSeedAllowed({
        NODE_ENV: 'production',
        SEED_ALLOW_PRODUCTION: '1',
      }),
    ).toThrow('El seed está bloqueado en producción');
  });
});
