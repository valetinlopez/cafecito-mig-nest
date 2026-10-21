import type { DatabaseConfig } from '../config/database.config.js';
import {
  createDataSourceOptions,
  createTypeOrmOptions,
} from './typeorm-options.js';

const DATABASE_CONFIG: DatabaseConfig = {
  url: 'postgresql://postgres:postgres@localhost:5432/cafecito',
  ssl: undefined,
  synchronize: false,
  logQueries: false,
  migrationsRun: false,
  pool: {
    max: 10,
    idleTimeoutMillis: 240_000,
    connectionTimeoutMillis: 10_000,
  },
};

describe('createTypeOrmOptions', () => {
  it('arma las opciones de PostgreSQL para Nest', () => {
    const options = createTypeOrmOptions(DATABASE_CONFIG);

    expect(options).toMatchObject({
      type: 'postgres',
      url: DATABASE_CONFIG.url,
      autoLoadEntities: true,
      synchronize: false,
      migrationsRun: false,
      poolSize: 10,
      connectTimeoutMS: 10_000,
      applicationName: 'cafecito-backend-nest',
    });
    expect(options.extra).toEqual({
      idleTimeoutMillis: 240_000,
      keepAlive: true,
    });
  });

  it('deja el logging en errores por defecto (CFB-145)', () => {
    expect(createTypeOrmOptions(DATABASE_CONFIG).logging).toEqual(['error']);
  });

  it('habilita el logging de queries solo si se pide explícitamente', () => {
    const options = createTypeOrmOptions({
      ...DATABASE_CONFIG,
      logQueries: true,
    });

    expect(options.logging).toEqual(['query', 'error', 'warn']);
  });

  it('propaga synchronize y migrationsRun desde la configuración', () => {
    const options = createTypeOrmOptions({
      ...DATABASE_CONFIG,
      synchronize: true,
      migrationsRun: true,
    });

    expect(options.synchronize).toBe(true);
    expect(options.migrationsRun).toBe(true);
  });

  it('mapea el SSL a las opciones de pg', () => {
    expect(createDataSourceOptions({ ...DATABASE_CONFIG, ssl: true }).ssl).toBe(
      true,
    );
    expect(
      createDataSourceOptions({ ...DATABASE_CONFIG, ssl: false }).ssl,
    ).toBe(false);
    expect(
      createDataSourceOptions({ ...DATABASE_CONFIG, ssl: undefined }).ssl,
    ).toBeUndefined();
  });

  it('instala un handler que evita que un error del pool tire el proceso', () => {
    const options = createDataSourceOptions(DATABASE_CONFIG);

    expect(typeof options.poolErrorHandler).toBe('function');
  });

  it('falla con un mensaje claro si no hay URL de conexión', () => {
    expect(() =>
      createTypeOrmOptions({ ...DATABASE_CONFIG, url: undefined }),
    ).toThrow(/DATABASE_URL no está configurada/);
  });
});
