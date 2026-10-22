import { performance } from 'node:perf_hooks';
import type { Request, Response } from 'express';
import { RESPONSE_TIME_HEADER } from './headers.js';
import {
  finishResponseTimer,
  formatMilliseconds,
  responseTimeMiddleware,
  startResponseTimer,
} from './response-time.js';

interface TimedResponseHarness {
  response: Response;
  setHeader: ReturnType<typeof vi.fn<(name: string, value: string) => void>>;
  setHeadersSent: (value: boolean) => void;
}

function createResponse(): TimedResponseHarness {
  const headers = new Map<string, string | number | string[]>();
  let headersSent = false;

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
    get headersSent() {
      return headersSent;
    },
  } as unknown as Response;

  return {
    response,
    setHeader,
    setHeadersSent: (value) => {
      headersSent = value;
    },
  };
}

describe('formatMilliseconds', () => {
  it('redondea a dos decimales sin ceros de relleno', () => {
    expect(formatMilliseconds(12.345)).toBe('12.35');
    expect(formatMilliseconds(8)).toBe('8');
    expect(formatMilliseconds(0.004)).toBe('0');
  });
});

describe('startResponseTimer', () => {
  it('conserva el primer instante registrado', () => {
    const { response } = createResponse();

    expect(startResponseTimer(response, 100)).toBe(100);
    expect(startResponseTimer(response, 200)).toBe(100);
  });
});

describe('finishResponseTimer', () => {
  it('escribe el header con el tiempo transcurrido', () => {
    const { response, setHeader } = createResponse();
    startResponseTimer(response);

    finishResponseTimer(response);

    const [header, value] = setHeader.mock.calls[0] ?? [];

    expect(header).toBe(RESPONSE_TIME_HEADER);
    expect(Number.isFinite(Number(value))).toBe(true);
  });

  it('usa el instante de fallback cuando no hay middleware', () => {
    const { response, setHeader } = createResponse();

    finishResponseTimer(response, performance.now() - 25);

    expect(setHeader).toHaveBeenCalledOnce();
  });

  it('no escribe nada si no hay instante de inicio', () => {
    const { response, setHeader } = createResponse();

    finishResponseTimer(response);

    expect(setHeader).not.toHaveBeenCalled();
  });

  it('no reescribe el header que ya puso el interceptor', () => {
    const { response, setHeader } = createResponse();
    startResponseTimer(response);
    finishResponseTimer(response);

    finishResponseTimer(response);

    expect(setHeader).toHaveBeenCalledOnce();
  });

  it('no toca una respuesta ya enviada', () => {
    const { response, setHeader, setHeadersSent } = createResponse();
    startResponseTimer(response);
    setHeadersSent(true);

    finishResponseTimer(response);

    expect(setHeader).not.toHaveBeenCalled();
  });
});

describe('responseTimeMiddleware', () => {
  it('arranca el reloj y delega la request', () => {
    const { response } = createResponse();
    let calledNext = false;

    responseTimeMiddleware({} as Request, response, () => {
      calledNext = true;
    });

    expect(calledNext).toBe(true);

    finishResponseTimer(response);
    expect(response.getHeader(RESPONSE_TIME_HEADER)).toBeDefined();
  });
});
