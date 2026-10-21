import { registerAs } from '@nestjs/config';
import { readNumber, readString } from './env.helpers.js';
import type { EnvironmentSource } from './env.helpers.js';

export type JwtAlgorithm = 'HS256' | 'HS384' | 'HS512';

export interface AuthConfig {
  secretKey: string;
  algorithm: JwtAlgorithm;
  accessTokenExpiresInMinutes: number;
}

const DEFAULT_ALGORITHM: JwtAlgorithm = 'HS256';
/** D-08 del contrato: el legacy firmaba tokens de 480 minutos. */
const DEFAULT_ACCESS_TOKEN_EXPIRE_MINUTES = 480;

export function loadAuthConfig(
  env: EnvironmentSource = process.env,
): AuthConfig {
  const algorithm = readString(env, 'ALGORITHM') ?? DEFAULT_ALGORITHM;

  return {
    secretKey: readString(env, 'SECRET_KEY') ?? '',
    algorithm: algorithm as JwtAlgorithm,
    accessTokenExpiresInMinutes: readNumber(
      env,
      'ACCESS_TOKEN_EXPIRE_MINUTES',
      DEFAULT_ACCESS_TOKEN_EXPIRE_MINUTES,
    ),
  };
}

export default registerAs('auth', (): AuthConfig => loadAuthConfig());
