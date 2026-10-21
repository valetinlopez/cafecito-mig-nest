import { registerAs } from '@nestjs/config';
import {
  DEFAULT_PORT,
  NodeEnvironment,
  readList,
  readNumber,
  resolveEnvironment,
} from './env.helpers.js';
import type { EnvironmentSource } from './env.helpers.js';

export interface AppConfig {
  environment: NodeEnvironment;
  isProduction: boolean;
  port: number;
  /** Orígenes de CORS ya normalizados (sin barra final). MIG-20 los consume. */
  corsOrigins: string[];
}

export function loadAppConfig(env: EnvironmentSource = process.env): AppConfig {
  const environment = resolveEnvironment(env);

  return {
    environment,
    isProduction: environment === NodeEnvironment.Production,
    port: readNumber(env, 'PORT', DEFAULT_PORT),
    corsOrigins: readList(env, 'CORS_ORIGINS'),
  };
}

export default registerAs('app', (): AppConfig => loadAppConfig());
