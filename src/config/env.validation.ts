import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';
import type { ValidationError } from 'class-validator';
import {
  DEFAULT_PORT,
  NODE_ENVIRONMENT_VALUES,
  NodeEnvironment,
  readList,
  readString,
  resolveEnvironment,
} from './env.helpers.js';
import type { EnvironmentSource } from './env.helpers.js';

const MIN_SECRET_KEY_LENGTH = 16;
const MIN_PORT = 1;
const MAX_PORT = 65535;
const MIN_ACCESS_TOKEN_MINUTES = 1;
const MAX_ACCESS_TOKEN_MINUTES = 60 * 24 * 30;
const REQUIRED_DATABASE_KEYS = ['DB_HOST', 'DB_USERNAME', 'DB_NAME'] as const;

const INVALID_SECRET_KEY_PLACEHOLDERS = /change-me|dev-only-secret/i;

/**
 * Schema de las variables de entorno del backend.
 *
 * Tipos y rangos los valida `class-validator`; las invariantes que cruzan
 * variables (URL de base de datos completa, secret en producción, orígenes de
 * CORS bien formados) se validan en `validateEnvironment`.
 *
 * Los nombres replican el `.env` del backend Python para que el cutover no
 * obligue a renombrar nada: `DATABASE_URL`, `SECRET_KEY`, `ALGORITHM`,
 * `ACCESS_TOKEN_EXPIRE_MINUTES`, `ENVIRONMENT` y `CORS_ORIGINS`.
 */
export class EnvironmentVariables {
  @IsOptional()
  @IsEnum(NodeEnvironment, {
    message: `NODE_ENV debe ser uno de: ${NODE_ENVIRONMENT_VALUES.join(', ')}`,
  })
  NODE_ENV?: NodeEnvironment;

  /** Alias legacy del backend Python. `NODE_ENV` tiene prioridad. */
  @IsOptional()
  @IsEnum(NodeEnvironment, {
    message: `ENVIRONMENT debe ser uno de: ${NODE_ENVIRONMENT_VALUES.join(', ')}`,
  })
  ENVIRONMENT?: NodeEnvironment;

  @IsOptional()
  @IsInt({ message: 'PORT debe ser un número entero' })
  @Min(MIN_PORT, { message: `PORT debe ser mayor o igual a ${MIN_PORT}` })
  @Max(MAX_PORT, { message: `PORT debe ser menor o igual a ${MAX_PORT}` })
  PORT?: number;

  /** URL completa (Neon, preprod, prod). Tiene prioridad sobre `DB_*`. */
  @IsOptional()
  @IsString({ message: 'DATABASE_URL debe ser un string' })
  DATABASE_URL?: string;

  @IsOptional()
  @IsString({ message: 'DB_HOST debe ser un string' })
  DB_HOST?: string;

  @IsOptional()
  @IsInt({ message: 'DB_PORT debe ser un número entero' })
  @Min(MIN_PORT, { message: `DB_PORT debe ser mayor o igual a ${MIN_PORT}` })
  @Max(MAX_PORT, { message: `DB_PORT debe ser menor o igual a ${MAX_PORT}` })
  DB_PORT?: number;

  @IsOptional()
  @IsString({ message: 'DB_USERNAME debe ser un string' })
  DB_USERNAME?: string;

  @IsOptional()
  @IsString({ message: 'DB_PASSWORD debe ser un string' })
  DB_PASSWORD?: string;

  @IsOptional()
  @IsString({ message: 'DB_NAME debe ser un string' })
  DB_NAME?: string;

  @IsOptional()
  @IsIn(['true', 'false'], { message: 'DB_SSL debe ser "true" o "false"' })
  DB_SSL?: string;

  @IsOptional()
  @IsIn(['true', 'false'], {
    message: 'DB_SYNCHRONIZE debe ser "true" o "false"',
  })
  DB_SYNCHRONIZE?: string;

  @IsOptional()
  @IsIn(['true', 'false'], {
    message: 'DB_LOGGING debe ser "true" o "false"',
  })
  DB_LOGGING?: string;

  @IsOptional()
  @IsIn(['true', 'false'], {
    message: 'DB_MIGRATIONS_RUN debe ser "true" o "false"',
  })
  DB_MIGRATIONS_RUN?: string;

  @IsOptional()
  @IsInt({ message: 'DB_POOL_MAX debe ser un número entero' })
  @Min(1, { message: 'DB_POOL_MAX debe ser mayor o igual a 1' })
  DB_POOL_MAX?: number;

  @IsOptional()
  @IsInt({ message: 'DB_IDLE_TIMEOUT_MS debe ser un número entero' })
  @Min(1000, { message: 'DB_IDLE_TIMEOUT_MS debe ser mayor o igual a 1000' })
  DB_IDLE_TIMEOUT_MS?: number;

  @IsOptional()
  @IsInt({ message: 'DB_CONNECT_TIMEOUT_MS debe ser un número entero' })
  @Min(1000, {
    message: 'DB_CONNECT_TIMEOUT_MS debe ser mayor o igual a 1000',
  })
  DB_CONNECT_TIMEOUT_MS?: number;

  @IsOptional()
  @IsString({ message: 'SECRET_KEY debe ser un string' })
  @MinLength(MIN_SECRET_KEY_LENGTH, {
    message: `SECRET_KEY debe tener al menos ${MIN_SECRET_KEY_LENGTH} caracteres`,
  })
  SECRET_KEY?: string;

  @IsOptional()
  @IsIn(['HS256', 'HS384', 'HS512'], {
    message: 'ALGORITHM debe ser HS256, HS384 o HS512',
  })
  ALGORITHM?: string;

  @IsOptional()
  @IsInt({ message: 'ACCESS_TOKEN_EXPIRE_MINUTES debe ser un número entero' })
  @Min(MIN_ACCESS_TOKEN_MINUTES, {
    message: `ACCESS_TOKEN_EXPIRE_MINUTES debe ser mayor o igual a ${MIN_ACCESS_TOKEN_MINUTES}`,
  })
  @Max(MAX_ACCESS_TOKEN_MINUTES, {
    message: `ACCESS_TOKEN_EXPIRE_MINUTES debe ser menor o igual a ${MAX_ACCESS_TOKEN_MINUTES}`,
  })
  ACCESS_TOKEN_EXPIRE_MINUTES?: number;

  @IsOptional()
  @IsString({ message: 'CORS_ORIGINS debe ser un string' })
  CORS_ORIGINS?: string;
}

function formatErrors(errors: ValidationError[], parent?: string): string[] {
  return errors.flatMap((error) => {
    const path = parent ? `${parent}.${error.property}` : error.property;
    const own = Object.values(error.constraints ?? {}).map(
      (message) => `${path}: ${message}`,
    );
    const children = formatErrors(error.children ?? [], path);

    return [...own, ...children];
  });
}

function isPresent(value: string | undefined): boolean {
  return readString({ value }, 'value') !== undefined;
}

function assertDatabaseConfigured(config: EnvironmentVariables): void {
  if (isPresent(config.DATABASE_URL)) {
    return;
  }

  const missing = REQUIRED_DATABASE_KEYS.filter(
    (key) => !isPresent(config[key]),
  );

  if (missing.length === 0) {
    return;
  }

  throw new Error(
    'Configuración de base de datos incompleta: definí DATABASE_URL o, ' +
      'para desarrollo local, DB_HOST + DB_USERNAME + DB_NAME ' +
      `(DB_PORT y DB_PASSWORD son opcionales). Faltan: ${missing.join(', ')}.`,
  );
}

function assertSecretKeyConfigured(
  config: EnvironmentVariables,
  environment: NodeEnvironment,
): void {
  if (!isPresent(config.SECRET_KEY)) {
    throw new Error(
      'Falta SECRET_KEY: es obligatoria para firmar los JWT (mínimo ' +
        `${MIN_SECRET_KEY_LENGTH} caracteres).`,
    );
  }

  if (
    environment === NodeEnvironment.Production &&
    INVALID_SECRET_KEY_PLACEHOLDERS.test(config.SECRET_KEY ?? '')
  ) {
    throw new Error(
      'SECRET_KEY conserva un valor de ejemplo: generá un secreto real antes ' +
        'de desplegar en producción.',
    );
  }
}

function assertCorsOriginsValid(config: EnvironmentVariables): void {
  const origins = config.CORS_ORIGINS
    ? readList({ CORS_ORIGINS: config.CORS_ORIGINS }, 'CORS_ORIGINS')
    : [];

  const invalid = origins.filter(
    (origin) => origin !== '*' && !/^https?:\/\/[^\s]+$/i.test(origin),
  );

  if (invalid.length > 0) {
    throw new Error(
      `CORS_ORIGINS contiene orígenes inválidos: ${invalid.join(', ')}. ` +
        'Usá URLs absolutas (http://localhost:3000) o "*".',
    );
  }
}

/**
 * `validate` que recibe `ConfigModule.forRoot({ validate })`.
 *
 * Corre antes de que se instancien los módulos: si falta una variable o tiene
 * un valor inválido, el proceso no arranca y el mensaje dice exactamente qué
 * corregir en el `.env`.
 */
export function validateEnvironment(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const source = config as EnvironmentSource;
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    const details = formatErrors(errors).map((line) => `  - ${line}`);

    throw new Error(
      ['Configuración de entorno inválida:', ...details].join('\n'),
    );
  }

  const environment = resolveEnvironment(source);

  assertDatabaseConfigured(validated);
  assertSecretKeyConfigured(validated, environment);
  assertCorsOriginsValid(validated);

  // Normaliza los valores que tienen default para que `ConfigService.get`
  // siempre devuelva un tipo concreto (PORT lo consume `main.ts`).
  validated.NODE_ENV = environment;
  validated.PORT ??= DEFAULT_PORT;

  return validated;
}
