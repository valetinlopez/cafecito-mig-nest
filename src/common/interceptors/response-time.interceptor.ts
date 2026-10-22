import { Injectable } from '@nestjs/common';
import type {
  CallHandler,
  ExecutionContext,
  NestInterceptor,
} from '@nestjs/common';
import type { Response } from 'express';
import { finalize } from 'rxjs';
import type { Observable } from 'rxjs';
import {
  finishResponseTimer,
  startResponseTimer,
} from '../http/response-time.js';

/**
 * Agrega `X-Response-Time-ms` a todas las respuestas (contrato D-11).
 *
 * Se implementa como interceptor global y no como middleware para poder
 * medir también los errores del handler y de los pipes: `finalize` corre
 * cuando el observable termina, antes de que el filtro de excepciones escriba
 * el body. El reloj lo arranca `responseTimeMiddleware`, así que el valor es la
 * duración completa de la request; el `startResponseTimer` local es el fallback
 * para tests unitarios sin middleware.
 */
@Injectable()
export class ResponseTimeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const response = context.switchToHttp().getResponse<Response>();
    const startedAt = startResponseTimer(response);

    return next.handle().pipe(
      finalize(() => {
        finishResponseTimer(response, startedAt);
      }),
    );
  }
}
