import { HttpStatus } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import type { Request, Response } from 'express';
import { buildCorsOptions } from './common/http/cors-options.js';
import {
  finishResponseTimer,
  responseTimeMiddleware,
} from './common/http/response-time.js';

/** Prefijo único de la API (D-01). El health queda fuera. */
export const API_PREFIX = 'api/v1';

/** Detalle del 404 para rutas que no entran al router de Nest. */
export const NOT_FOUND_DETAIL = 'Recurso no encontrado';

export interface AppSetupOptions {
  /** Orígenes ya normalizados desde `CORS_ORIGINS` (`appConfig.corsOrigins`). */
  corsOrigins: readonly string[];
}

/**
 * Cableado HTTP compartido por `main.ts` y los e2e.
 *
 * Mantener el prefijo, CORS y el fallback en un solo lugar evita que el
 * arranque real y los tests de contrato se desincronicen.
 *
 * Inicializa la app a propósito: el fallback tiene que quedar **después** del
 * router de Nest para no interceptar las rutas reales. Un `listen()` posterior
 * reutiliza la app ya inicializada.
 */
export async function configureApp(
  app: INestApplication,
  options: AppSetupOptions,
): Promise<void> {
  // Primer middleware del stack: arranca el reloj antes de CORS, guards y pipes.
  app.use(responseTimeMiddleware);

  app.setGlobalPrefix(API_PREFIX, { exclude: ['/'] });
  app.enableCors(buildCorsOptions(options.corsOrigins));

  await app.init();

  registerNotFoundFallback(app);
}

/**
 * Express responde su 404 HTML cuando el path no matchea el prefijo global
 * (por ejemplo `/mesas` en lugar de `/api/v1/mesas`). El contrato exige
 * `{ detail }` en todo no-2xx, así que se reemplaza por JSON.
 */
function registerNotFoundFallback(app: INestApplication): void {
  app.use((_request: Request, response: Response) => {
    finishResponseTimer(response);

    response.status(HttpStatus.NOT_FOUND).json({ detail: NOT_FOUND_DETAIL });
  });
}
