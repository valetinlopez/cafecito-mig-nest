import type { CallHandler, ExecutionContext } from '@nestjs/common';
import type { Response } from 'express';
import { lastValueFrom, of, throwError } from 'rxjs';
import { RESPONSE_TIME_HEADER } from '../http/headers.js';
import { ResponseTimeInterceptor } from './response-time.interceptor.js';

interface Harness {
  interceptor: ResponseTimeInterceptor;
  context: ExecutionContext;
  setHeader: ReturnType<typeof vi.fn<(name: string, value: string) => void>>;
}

function createHarness(headersSent = false): Harness {
  const headers = new Map<string, string | number | string[]>();
  const setHeader = vi.fn<(name: string, value: string) => void>(
    (name, value) => {
      headers.set(name, value);
    },
  );
  const getHeader = vi.fn<
    (name: string) => string | number | string[] | undefined
  >((name) => headers.get(name));
  const response = {
    setHeader,
    getHeader,
    headersSent,
  } as unknown as Response;
  const context = {
    switchToHttp: () => ({ getResponse: () => response }),
  } as unknown as ExecutionContext;

  return { interceptor: new ResponseTimeInterceptor(), context, setHeader };
}

function handlerOf<T>(value: T): CallHandler<T> {
  return { handle: () => of(value) };
}

describe('ResponseTimeInterceptor', () => {
  it('agrega el header con un valor numérico en una respuesta exitosa', async () => {
    const { interceptor, context, setHeader } = createHarness();

    const result: unknown = await lastValueFrom(
      interceptor.intercept(context, handlerOf({ ok: true })),
    );

    expect(result).toEqual({ ok: true });
    expect(setHeader).toHaveBeenCalledOnce();

    const [header, value] = setHeader.mock.calls[0] ?? [];

    expect(header).toBe(RESPONSE_TIME_HEADER);
    expect(Number.isFinite(Number(value))).toBe(true);
  });

  it('agrega el header también cuando el handler falla', async () => {
    const { interceptor, context, setHeader } = createHarness();
    const failing: CallHandler = {
      handle: () => throwError(() => new Error('boom')),
    };

    await expect(
      lastValueFrom(interceptor.intercept(context, failing)),
    ).rejects.toThrow('boom');

    expect(setHeader).toHaveBeenCalledOnce();
  });

  it('no toca el header si la respuesta ya fue enviada', async () => {
    const { interceptor, context, setHeader } = createHarness(true);

    await lastValueFrom(interceptor.intercept(context, handlerOf('ok')));

    expect(setHeader).not.toHaveBeenCalled();
  });
});
