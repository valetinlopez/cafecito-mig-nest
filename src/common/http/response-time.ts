import { performance } from 'node:perf_hooks';
import type { NextFunction, Request, Response } from 'express';
import { RESPONSE_TIME_HEADER } from './headers.js';

/**
 * Medición de tiempo compartida por todas las capas.
 *
 * El reloj arranca en un middleware (antes de CORS, guards y pipes) y lo cierra
 * la primera capa que responda: el interceptor en el camino feliz, el filtro de
 * excepciones en un error de guard o de ruta, o el fallback 404. Así el header
 * no depende de que la request haya llegado al handler.
 */

const REQUEST_STARTED_AT = Symbol('requestStartedAt');

type TimedResponse = Response & { [REQUEST_STARTED_AT]?: number };

/** Redondea a dos decimales y evita notación exponencial en valores chicos. */
export function formatMilliseconds(elapsed: number): string {
  return (Math.round(elapsed * 100) / 100).toString();
}

/** Arranca el reloj si la request no lo arrancó antes y devuelve el instante. */
export function startResponseTimer(
  response: Response,
  startedAt = performance.now(),
): number {
  const timed = response as TimedResponse;
  const existing = timed[REQUEST_STARTED_AT];

  if (existing !== undefined) {
    return existing;
  }

  timed[REQUEST_STARTED_AT] = startedAt;

  return startedAt;
}

/**
 * Escribe el header una sola vez. Si la respuesta ya se envió, o el interceptor
 * ya lo escribió, no hace nada.
 */
export function finishResponseTimer(
  response: Response,
  fallbackStartedAt?: number,
): void {
  if (
    response.headersSent ||
    response.getHeader(RESPONSE_TIME_HEADER) !== undefined
  ) {
    return;
  }

  const startedAt =
    (response as TimedResponse)[REQUEST_STARTED_AT] ?? fallbackStartedAt;

  if (startedAt === undefined) {
    return;
  }

  response.setHeader(
    RESPONSE_TIME_HEADER,
    formatMilliseconds(performance.now() - startedAt),
  );
}

/** Primer middleware del stack: arranca el reloj de toda request. */
export function responseTimeMiddleware(
  _request: Request,
  response: Response,
  next: NextFunction,
): void {
  startResponseTimer(response);
  next();
}
