/**
 * Helpers de lectura del entorno compartidos por `env.validation.ts` y por los
 * factories de `src/config/*.config.ts`.
 *
 * `process.env` solo contiene strings: la conversión de tipos vive acá una sola
 * vez para que la validación de arranque y el runtime no puedan discrepar.
 */

export enum NodeEnvironment {
  Development = 'development',
  Test = 'test',
  Production = 'production',
}

export const NODE_ENVIRONMENT_VALUES = Object.values(NodeEnvironment);

/** Origen de variables: `process.env` en runtime, o un objeto en los tests. */
export type EnvironmentSource = Record<string, string | undefined>;

/**
 * Entornos que pueden apuntar a una base local. Cualquier otro host se trata
 * como remoto (Neon incluido) y queda protegido por el guard de `synchronize`.
 */
const LOCAL_DATABASE_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '::1',
  '0.0.0.0',
  'host.docker.internal',
]);

const TRUE_VALUES = new Set(['true', '1']);
const FALSE_VALUES = new Set(['false', '0']);

export const DEFAULT_PORT = 3000;

export function readString(
  env: EnvironmentSource,
  key: string,
): string | undefined {
  const value = env[key]?.trim();

  return value === '' ? undefined : value;
}

export function readNumber(
  env: EnvironmentSource,
  key: string,
  fallback: number,
): number {
  const raw = readString(env, key);

  if (raw === undefined) {
    return fallback;
  }

  const parsed = Number(raw);

  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * `ENVIRONMENT` es el nombre que usa el backend Python (legacy); `NODE_ENV` es
 * el estándar del ecosistema Node y tiene prioridad. Sin ninguno de los dos se
 * asume desarrollo.
 */
export function resolveEnvironment(env: EnvironmentSource): NodeEnvironment {
  const raw = readString(env, 'NODE_ENV') ?? readString(env, 'ENVIRONMENT');

  if (raw === undefined) {
    return NodeEnvironment.Development;
  }

  const normalized = raw.toLowerCase();

  if (NODE_ENVIRONMENT_VALUES.includes(normalized as NodeEnvironment)) {
    return normalized as NodeEnvironment;
  }

  // `validateEnvironment` reporta el valor inválido con un mensaje en español.
  return NodeEnvironment.Development;
}

export function readBoolean(
  env: EnvironmentSource,
  key: string,
): boolean | undefined {
  const raw = readString(env, key)?.toLowerCase();

  if (raw === undefined) {
    return undefined;
  }

  if (TRUE_VALUES.has(raw)) {
    return true;
  }

  if (FALSE_VALUES.has(raw)) {
    return false;
  }

  throw new Error(
    `La variable ${key} debe ser "true" o "false" (recibido: "${raw}").`,
  );
}

/** Lista separada por comas; normaliza espacios y barras finales. */
export function readList(env: EnvironmentSource, key: string): string[] {
  return (readString(env, key) ?? '')
    .split(',')
    .map((item) => item.trim().replace(/\/+$/, ''))
    .filter((item) => item.length > 0);
}

export function isLocalHost(host: string | undefined): boolean {
  if (host === undefined) {
    return false;
  }

  const normalized = host
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, '');

  return LOCAL_DATABASE_HOSTS.has(normalized) || normalized.endsWith('.local');
}

export function extractHost(url: string | undefined): string | undefined {
  if (url === undefined) {
    return undefined;
  }

  try {
    return new URL(url).hostname;
  } catch {
    return undefined;
  }
}
