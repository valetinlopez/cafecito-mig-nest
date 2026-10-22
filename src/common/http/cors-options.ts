import { Logger } from '@nestjs/common';
import { RESPONSE_TIME_HEADER } from './headers.js';

/**
 * Configuración de CORS derivada de `CORS_ORIGINS` (contrato D-16).
 *
 * El legacy normalizaba espacios y barra final antes de comparar, y caía en
 * `http://localhost:3000` cuando la variable no estaba definida. Se replica ese
 * comportamiento para que el front no note el cambio de backend.
 */

/** Orígenes permitidos cuando `CORS_ORIGINS` está vacía (default del legacy). */
export const DEFAULT_CORS_ORIGINS = ['http://localhost:3000'] as const;

const WILDCARD = '*';

/** `methods`/`headers` abiertos, igual que el `main.py` actual. */
const ALLOWED_METHODS = [
  'GET',
  'HEAD',
  'PUT',
  'PATCH',
  'POST',
  'DELETE',
  'OPTIONS',
] as const;

const logger = new Logger('CorsOptions');

/**
 * Subconjunto de `CorsOptions` que usa el bootstrap. Se declara localmente para
 * no depender de un import profundo dentro de `@nestjs/common`.
 */
export interface CorsSettings {
  origin: string[] | boolean;
  credentials: boolean;
  methods: string[];
  exposedHeaders: string[];
}

/** Quita espacios, barras finales y duplicados de la lista de orígenes. */
export function normalizeCorsOrigins(origins: readonly string[]): string[] {
  const normalized = origins
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter((origin) => origin.length > 0);

  return [...new Set(normalized)];
}

/**
 * Traduce la lista de orígenes al objeto que consume `app.enableCors()`.
 *
 * - Lista explícita: solo esos orígenes, con credenciales.
 * - Lista vacía: default del legacy (`http://localhost:3000`).
 * - `*`: se refleja el origen del request. Express no puede mandar `*` junto a
 *   `credentials: true` (el navegador lo rechaza), así que reflejar es la única
 *   forma de respetar el wildcard; queda logueado como advertencia porque
 *   expone la API a cualquier origen.
 */
export function buildCorsOptions(origins: readonly string[]): CorsSettings {
  const normalized = normalizeCorsOrigins(origins);
  const configured =
    normalized.length > 0 ? normalized : [...DEFAULT_CORS_ORIGINS];

  const base: CorsSettings = {
    origin: configured,
    credentials: true,
    methods: [...ALLOWED_METHODS],
    // Sin `exposedHeaders` el navegador no puede leer el header de tiempo.
    exposedHeaders: [RESPONSE_TIME_HEADER],
  };

  if (!configured.includes(WILDCARD)) {
    return base;
  }

  logger.warn(
    'CORS_ORIGINS incluye "*": se acepta cualquier origen con credenciales. ' +
      'Configurá una lista explícita antes de desplegar a producción.',
  );

  return { ...base, origin: true };
}
