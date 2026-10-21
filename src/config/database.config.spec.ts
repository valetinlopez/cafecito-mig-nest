import {
  DEFAULT_IDLE_TIMEOUT_MS,
  DEFAULT_POOL_MAX,
  loadDatabaseConfig,
  resolveDatabaseUrl,
} from './database.config.js';

const NEON_URL =
  'postgresql://user:pass@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require';

const LOCAL_ENV = {
  NODE_ENV: 'development',
  DB_HOST: 'localhost',
  DB_PORT: '5432',
  DB_USERNAME: 'postgres',
  DB_PASSWORD: 'postgres',
  DB_NAME: 'cafecito',
};

describe('loadDatabaseConfig', () => {
  it('prioriza DATABASE_URL sobre las variables DB_*', () => {
    const config = loadDatabaseConfig({
      ...LOCAL_ENV,
      DATABASE_URL: NEON_URL,
    });

    expect(config.url).toBe(NEON_URL);
  });

  it('arma la URL con las variables DB_* cuando no hay DATABASE_URL', () => {
    const config = loadDatabaseConfig(LOCAL_ENV);

    expect(config.url).toBe(
      'postgresql://postgres:postgres@localhost:5432/cafecito',
    );
  });

  it('escapa caracteres especiales del password al armar la URL', () => {
    const url = resolveDatabaseUrl({
      ...LOCAL_ENV,
      DB_PASSWORD: 'p@ss:word/2026',
    });

    expect(url).toContain('p%40ss%3Aword%2F2026');
  });

  it('habilita synchronize en desarrollo contra un host local', () => {
    expect(loadDatabaseConfig(LOCAL_ENV).synchronize).toBe(true);
  });

  it('no habilita synchronize en desarrollo contra Neon', () => {
    const config = loadDatabaseConfig({
      NODE_ENV: 'development',
      DATABASE_URL: NEON_URL,
    });

    expect(config.url).toBe(NEON_URL);
    expect(config.synchronize).toBe(false);
  });

  it('nunca habilita synchronize en producción', () => {
    const config = loadDatabaseConfig({
      ...LOCAL_ENV,
      NODE_ENV: 'production',
      SECRET_KEY: 'production-secret-key-1234',
    });

    expect(config.synchronize).toBe(false);
  });

  it('ignora DB_SYNCHRONIZE=true en producción', () => {
    const config = loadDatabaseConfig({
      ...LOCAL_ENV,
      NODE_ENV: 'production',
      DB_SYNCHRONIZE: 'true',
    });

    expect(config.synchronize).toBe(false);
  });

  it('respeta DB_SYNCHRONIZE=false en desarrollo', () => {
    const config = loadDatabaseConfig({
      ...LOCAL_ENV,
      DB_SYNCHRONIZE: 'false',
    });

    expect(config.synchronize).toBe(false);
  });

  it('configura el pool por debajo del autosuspend de Neon', () => {
    const config = loadDatabaseConfig(LOCAL_ENV);

    expect(config.pool.max).toBe(DEFAULT_POOL_MAX);
    expect(config.pool.idleTimeoutMillis).toBe(DEFAULT_IDLE_TIMEOUT_MS);
    expect(config.pool.idleTimeoutMillis).toBeLessThan(5 * 60 * 1000);
  });

  it('fuerza TLS en producción contra un host remoto sin sslmode', () => {
    const config = loadDatabaseConfig({
      NODE_ENV: 'production',
      DATABASE_URL:
        'postgresql://user:pass@db.internal.example.com:5432/cafecito',
      SECRET_KEY: 'production-secret-key-1234',
    });

    expect(config.ssl).toBe(true);
  });

  it('deja el SSL de la URL a cargo de pg cuando viene sslmode', () => {
    const config = loadDatabaseConfig({
      NODE_ENV: 'production',
      DATABASE_URL: NEON_URL,
      SECRET_KEY: 'production-secret-key-1234',
    });

    expect(config.ssl).toBeUndefined();
  });

  it('respeta DB_SSL=false explícito', () => {
    const config = loadDatabaseConfig({
      ...LOCAL_ENV,
      NODE_ENV: 'production',
      DB_SSL: 'false',
    });

    expect(config.ssl).toBe(false);
  });

  it('rechaza DB_* cuando falta el nombre de la base', () => {
    const config = loadDatabaseConfig({ ...LOCAL_ENV, DB_NAME: '' });

    expect(config.url).toBeUndefined();
  });
});
