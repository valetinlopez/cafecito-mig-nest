import {
  BadRequestException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { MockInstance } from 'vitest';
import {
  AllExceptionsFilter,
  INTERNAL_ERROR_DETAIL,
} from './all-exceptions.filter.js';

interface Harness {
  filter: AllExceptionsFilter;
  host: ArgumentsHost;
  status: ReturnType<
    typeof vi.fn<(status: number) => { json: (body: unknown) => void }>
  >;
  json: ReturnType<typeof vi.fn<(body: unknown) => void>>;
}

function createHarness(headersSent = false): Harness {
  const json = vi.fn<(body: unknown) => void>();
  const status = vi.fn<(status: number) => { json: (body: unknown) => void }>(
    () => ({ json }),
  );
  const response = {
    status,
    headersSent,
    getHeader: vi.fn(() => undefined),
  } as unknown as Response;
  const request = {
    method: 'GET',
    originalUrl: '/api/v1/mesas',
  } as unknown as Request;
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost;

  return { filter: new AllExceptionsFilter(), host, status, json };
}

describe('AllExceptionsFilter', () => {
  let errorLog: MockInstance<typeof Logger.prototype.error>;

  beforeEach(() => {
    errorLog = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {
      /* silencio intencional: se verifica con el spy */
    });
  });

  afterEach(() => {
    errorLog.mockRestore();
  });

  it('traduce un 404 al envelope { detail }', () => {
    const { filter, host, status, json } = createHarness();

    filter.catch(new NotFoundException('Mesa no encontrada'), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({ detail: 'Mesa no encontrada' });
    expect(errorLog).not.toHaveBeenCalled();
  });

  it('usa el primer mensaje cuando el payload trae un array', () => {
    const { filter, host, json } = createHarness();
    const exception = new BadRequestException({
      message: ['primer error', 'segundo error'],
    });

    filter.catch(exception, host);

    expect(json).toHaveBeenCalledWith({ detail: 'primer error' });
  });

  it('devuelve un 500 genérico y loguea el error inesperado', () => {
    const { filter, host, status, json } = createHarness();

    filter.catch(new Error('falla con un secreto interno'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ detail: INTERNAL_ERROR_DETAIL });
    expect(errorLog).toHaveBeenCalledOnce();
    expect(String(errorLog.mock.calls[0]?.[0])).toContain('secreto interno');
  });

  it('no expone el mensaje de una HttpException 500', () => {
    const { filter, host, json } = createHarness();

    filter.catch(new InternalServerErrorException('detalle interno'), host);

    expect(json).toHaveBeenCalledWith({ detail: INTERNAL_ERROR_DETAIL });
    expect(errorLog).toHaveBeenCalledOnce();
  });

  it('no reescribe una respuesta que ya se envió', () => {
    const { filter, host, status, json } = createHarness(true);

    filter.catch(new NotFoundException('Mesa no encontrada'), host);

    expect(status).not.toHaveBeenCalled();
    expect(json).not.toHaveBeenCalled();
  });

  it('normaliza un valor lanzado que no es Error', () => {
    const { filter, host, status, json } = createHarness();

    filter.catch('algo raro', host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ detail: INTERNAL_ERROR_DETAIL });
    expect(errorLog).toHaveBeenCalledOnce();
  });
});
