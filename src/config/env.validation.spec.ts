import { NodeEnvironment } from './env.helpers.js';
import { validateEnvironment } from './env.validation.js';

const VALID_ENV = {
  NODE_ENV: 'development',
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/cafecito',
  SECRET_KEY: 'development-secret-key-1234',
};

function without<T extends Record<string, string>, K extends keyof T>(
  source: T,
  ...keys: K[]
): Omit<T, K> {
  const copy: Record<string, string> = { ...source };

  for (const key of keys) {
    delete copy[key as string];
  }

  return copy as Omit<T, K>;
}

describe('validateEnvironment', () => {
  it('convierte tipos y devuelve la configuración válida', () => {
    const config = validateEnvironment({
      ...VALID_ENV,
      PORT: '3001',
      ACCESS_TOKEN_EXPIRE_MINUTES: '60',
    });

    expect(config.NODE_ENV).toBe(NodeEnvironment.Development);
    expect(config.PORT).toBe(3001);
    expect(config.ACCESS_TOKEN_EXPIRE_MINUTES).toBe(60);
  });

  it('usa el puerto 3000 por defecto', () => {
    expect(validateEnvironment(VALID_ENV).PORT).toBe(3000);
  });

  it('usa ENVIRONMENT como alias legacy cuando falta NODE_ENV', () => {
    const config = validateEnvironment({
      ...without(VALID_ENV, 'NODE_ENV'),
      ENVIRONMENT: 'production',
      SECRET_KEY: 'production-secret-key-1234',
    });

    expect(config.NODE_ENV).toBe(NodeEnvironment.Production);
  });

  it('acepta las variables DB_* cuando no hay DATABASE_URL', () => {
    const config = validateEnvironment({
      ...without(VALID_ENV, 'DATABASE_URL'),
      DB_HOST: 'localhost',
      DB_USERNAME: 'postgres',
      DB_NAME: 'cafecito',
    });

    expect(config.DB_NAME).toBe('cafecito');
  });

  it('falla si no hay DATABASE_URL ni variables DB_*', () => {
    expect(() =>
      validateEnvironment(without(VALID_ENV, 'DATABASE_URL')),
    ).toThrow(/Faltan: DB_HOST, DB_USERNAME, DB_NAME/);
  });

  it('trata DATABASE_URL vacía como ausente', () => {
    expect(() =>
      validateEnvironment({
        ...without(VALID_ENV, 'DATABASE_URL'),
        DATABASE_URL: '   ',
      }),
    ).toThrow(/Configuración de base de datos incompleta/);
  });

  it('falla si falta SECRET_KEY', () => {
    expect(() => validateEnvironment(without(VALID_ENV, 'SECRET_KEY'))).toThrow(
      /Falta SECRET_KEY/,
    );
  });

  it('rechaza un SECRET_KEY de ejemplo en producción', () => {
    expect(() =>
      validateEnvironment({
        ...VALID_ENV,
        NODE_ENV: 'production',
        SECRET_KEY: 'dev-only-secret-change-me-in-production',
      }),
    ).toThrow(/valor de ejemplo/);
  });

  it('falla con un PORT inválido', () => {
    expect(() => validateEnvironment({ ...VALID_ENV, PORT: 'abc' })).toThrow(
      /Configuración de entorno inválida/,
    );
  });

  it('rechaza un NODE_ENV desconocido', () => {
    expect(() =>
      validateEnvironment({ ...VALID_ENV, NODE_ENV: 'staging' }),
    ).toThrow(/NODE_ENV debe ser uno de/);
  });

  it('rechaza orígenes de CORS inválidos', () => {
    expect(() =>
      validateEnvironment({
        ...VALID_ENV,
        CORS_ORIGINS: 'localhost:3000,https://app.cafecito.com',
      }),
    ).toThrow(/CORS_ORIGINS contiene orígenes inválidos/);
  });
});
