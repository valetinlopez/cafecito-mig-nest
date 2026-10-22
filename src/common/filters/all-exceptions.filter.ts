import {
  Catch,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { Request, Response } from 'express';
import { finishResponseTimer } from '../http/response-time.js';

export const INTERNAL_ERROR_DETAIL = 'Error interno del servidor';

const SERVER_ERROR_MIN: number = HttpStatus.INTERNAL_SERVER_ERROR;

/**
 * Único filtro global de excepciones (ADR 0002).
 *
 * Garantiza que **toda** respuesta no-2xx tenga exactamente `{ detail }` y
 * nada más: el front lee `json.detail` y un shape distinto degrada todos sus
 * mensajes. Los 5xx se loguean con el stack porque el body no expone detalle.
 */
@Injectable()
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    // Una respuesta ya enviada (streaming, `@Res()` manual) no se reescribe.
    if (response.headersSent) {
      return;
    }

    const status = resolveStatus(exception);
    const detail = resolveDetail(exception, status);

    if (status >= SERVER_ERROR_MIN) {
      const reason =
        exception instanceof Error ? exception.message : String(exception);

      this.logger.error(
        `${request.method} ${request.originalUrl} → ${status}: ${reason}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    // Cubre errores que no pasan por el interceptor (guards, rutas inexistentes).
    finishResponseTimer(response);

    response.status(status).json({ detail });
  }
}

function resolveStatus(exception: unknown): number {
  return exception instanceof HttpException
    ? exception.getStatus()
    : HttpStatus.INTERNAL_SERVER_ERROR;
}

/**
 * Extrae el mensaje legible. En 5xx siempre es el genérico: el detalle real va
 * al log y nunca al cliente.
 */
function resolveDetail(exception: unknown, status: number): string {
  if (status >= SERVER_ERROR_MIN) {
    return INTERNAL_ERROR_DETAIL;
  }

  if (!(exception instanceof HttpException)) {
    return INTERNAL_ERROR_DETAIL;
  }

  const payload = exception.getResponse();

  if (typeof payload === 'string') {
    return payload;
  }

  if (typeof payload === 'object' && payload !== null) {
    const { message } = payload as { message?: unknown };

    if (Array.isArray(message)) {
      const first = message.find(
        (item): item is string =>
          typeof item === 'string' && item.trim() !== '',
      );

      if (first !== undefined) {
        return first;
      }
    }

    if (typeof message === 'string' && message.trim() !== '') {
      return message;
    }
  }

  return exception.message;
}
