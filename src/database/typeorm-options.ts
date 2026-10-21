import { Logger } from '@nestjs/common';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'node:path';
import type { PostgresDataSourceOptions } from 'typeorm/driver/postgres/PostgresDataSourceOptions.js';
import type { DatabaseConfig } from '../config/database.config.js';

const APPLICATION_NAME = 'cafecito-backend-nest';
const MIGRATIONS_GLOB = join(import.meta.dirname, 'migrations', '*.js');
const poolLogger = new Logger('PostgresPool');

/**
 * Opciones de PostgreSQL compartidas por Nest (`TypeOrmModule.forRootAsync`) y
 * por el CLI de migraciones (`src/database/data-source.ts`).
 *
 * Decisiones:
 * - `synchronize` lo resuelve `database.config.ts` (dev + host local).
 * - `logging` queda en errores: el backend Python sacó `echo=True` en CFB-145
 *   porque llenaba la consola de SQL.
 * - `extra.idleTimeoutMillis` descarta clientes antes de que Neon los cierre
 *   por inactividad (CFB-157) y `poolErrorHandler` evita que un error del pool
 *   tire abajo el proceso.
 */
export function createDataSourceOptions(
  config: DatabaseConfig,
): PostgresDataSourceOptions {
  if (config.url === undefined || config.url === '') {
    throw new Error(
      'DATABASE_URL no está configurada: revisá el .env (ver README, sección "Variables de entorno").',
    );
  }

  return {
    type: 'postgres',
    url: config.url,
    applicationName: APPLICATION_NAME,
    ssl: config.ssl,
    synchronize: config.synchronize,
    migrations: [MIGRATIONS_GLOB],
    migrationsRun: config.migrationsRun,
    logging: config.logQueries ? ['query', 'error', 'warn'] : ['error'],
    poolSize: config.pool.max,
    connectTimeoutMS: config.pool.connectionTimeoutMillis,
    extra: {
      idleTimeoutMillis: config.pool.idleTimeoutMillis,
      keepAlive: true,
    },
    poolErrorHandler: (error: unknown): void => {
      poolLogger.warn(`Error en el pool de PostgreSQL: ${String(error)}`);
    },
  };
}

export function createTypeOrmOptions(
  config: DatabaseConfig,
): TypeOrmModuleOptions {
  return {
    ...createDataSourceOptions(config),
    autoLoadEntities: true,
  };
}
