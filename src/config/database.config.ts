import { registerAs } from '@nestjs/config';
import {
  NodeEnvironment,
  extractHost,
  isLocalHost,
  readBoolean,
  readNumber,
  readString,
  resolveEnvironment,
} from './env.helpers.js';
import type { EnvironmentSource } from './env.helpers.js';

export interface DatabasePoolConfig {
  max: number;
  /**
   * Neon suspende la base y cierra las conexiones tras 5 minutos sin uso.
   * El pool descarta sus clientes ociosos antes (equivalente práctico al
   * `pool_pre_ping` del backend Python).
   */
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
}

export interface DatabaseConfig {
  /** URL de conexión resuelta (`DATABASE_URL` o armada con las `DB_*`). */
  url?: string;
  /** `true`/`false` fuerza TLS; `undefined` deja decidir a `pg` (URL). */
  ssl?: boolean;
  synchronize: boolean;
  logQueries: boolean;
  migrationsRun: boolean;
  pool: DatabasePoolConfig;
}

/** Justo por debajo del autosuspend de 5 minutos de Neon. */
export const DEFAULT_IDLE_TIMEOUT_MS = 4 * 60 * 1000;
export const DEFAULT_POOL_MAX = 10;
export const DEFAULT_CONNECT_TIMEOUT_MS = 10 * 1000;

const DEFAULT_DATABASE_PORT = 5432;

function buildUrlFromParts(env: EnvironmentSource): string | undefined {
  const host = readString(env, 'DB_HOST');
  const username = readString(env, 'DB_USERNAME');
  const database = readString(env, 'DB_NAME');

  if (host === undefined || username === undefined || database === undefined) {
    return undefined;
  }

  const url = new URL('postgresql://localhost');
  url.hostname = host;
  url.port = String(readNumber(env, 'DB_PORT', DEFAULT_DATABASE_PORT));
  url.username = username;
  url.password = readString(env, 'DB_PASSWORD') ?? '';
  url.pathname = `/${database}`;

  return url.toString();
}

export function resolveDatabaseUrl(
  env: EnvironmentSource = process.env,
): string | undefined {
  return readString(env, 'DATABASE_URL') ?? buildUrlFromParts(env);
}

/** Una URL con `sslmode` explícito la resuelve `pg`, no nosotros. */
function hasSslMode(url: string | undefined): boolean {
  return url !== undefined && /[?&]sslmode=/i.test(url);
}

function resolveSsl(
  env: EnvironmentSource,
  url: string | undefined,
  local: boolean,
  environment: NodeEnvironment,
): boolean | undefined {
  const explicit = readBoolean(env, 'DB_SSL');

  if (explicit !== undefined) {
    return explicit;
  }

  if (hasSslMode(url)) {
    return undefined;
  }

  return environment === NodeEnvironment.Production && !local
    ? true
    : undefined;
}

/**
 * Configuración de base de datos.
 *
 * `synchronize` solo se habilita por defecto en desarrollo **y** contra un host
 * local. La base de Neon es compartida con producción y tiene datos reales: si
 * un `.env` de desarrollo apunta a Neon, TypeORM no debe tocar el esquema.
 */
export function loadDatabaseConfig(
  env: EnvironmentSource = process.env,
): DatabaseConfig {
  const environment = resolveEnvironment(env);
  const url = resolveDatabaseUrl(env);
  const host = extractHost(url) ?? readString(env, 'DB_HOST');
  const local = isLocalHost(host);
  const explicitSynchronize = readBoolean(env, 'DB_SYNCHRONIZE');

  return {
    url,
    ssl: resolveSsl(env, url, local, environment),
    synchronize:
      environment === NodeEnvironment.Production
        ? false
        : (explicitSynchronize ??
          (environment === NodeEnvironment.Development && local)),
    logQueries: readBoolean(env, 'DB_LOGGING') ?? false,
    migrationsRun: readBoolean(env, 'DB_MIGRATIONS_RUN') ?? false,
    pool: {
      max: readNumber(env, 'DB_POOL_MAX', DEFAULT_POOL_MAX),
      idleTimeoutMillis: readNumber(
        env,
        'DB_IDLE_TIMEOUT_MS',
        DEFAULT_IDLE_TIMEOUT_MS,
      ),
      connectionTimeoutMillis: readNumber(
        env,
        'DB_CONNECT_TIMEOUT_MS',
        DEFAULT_CONNECT_TIMEOUT_MS,
      ),
    },
  };
}

export default registerAs('database', (): DatabaseConfig =>
  loadDatabaseConfig(),
);
