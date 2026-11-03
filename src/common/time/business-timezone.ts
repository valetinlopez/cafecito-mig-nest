/**
 * Conversión entre las fechas del negocio y el eje UTC del backend.
 *
 * El negocio razona en días de calendario de
 * `America/Argentina/Buenos_Aires` (ADR 0003, D-03 de `dashboard`), pero
 * `pagos.fecha` se guarda como `timestamp without time zone` en UTC. Filtrar
 * una fecha local directamente en UTC cortaría el turno de la noche: un cobro
 * del día 19 a las 22:00 local es el 20 a la 01:00 UTC.
 *
 * | Borde                  | Función                  | Resultado                    |
 * | ---------------------- | ------------------------ | ---------------------------- |
 * | Día en curso           | `getBusinessDayRange`    | `[inicio, inicio+1d)` en UTC |
 * | Rango pedido por el UI | `getBusinessDateRange`   | `[desde, hasta+1d)` en UTC   |
 *
 * El intervalo es **semiabierto** (`>= start` y `< end`) para no depender de
 * la precisión de los milisegundos del último instante del día.
 */

/** Zona horaria de referencia del negocio (ADR 0003). */
export const BUSINESS_TIME_ZONE = 'America/Argentina/Buenos_Aires';

export interface BusinessDateParts {
  year: number;
  month: number;
  day: number;
}

export interface BusinessDateRange {
  /** Límite inferior inclusivo, expresado en UTC. */
  start: Date;
  /** Límite superior exclusivo, expresado en UTC. */
  end: Date;
}

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const MONTH_RANGE = { min: 1, max: 12 } as const;
const DAY_RANGE = { min: 1, max: 31 } as const;

/**
 * Rango UTC del día de negocio en curso.
 *
 * Se usa para "ventas del día" del dashboard: el corte es la medianoche local,
 * no la medianoche UTC.
 */
export function getBusinessDayRange(now: Date): BusinessDateRange {
  const today = getBusinessDateParts(now);

  return {
    start: businessDateToUtc(today),
    end: businessDateToUtc(nextDay(today)),
  };
}

/**
 * Rango UTC de un período inclusivo pedido por el usuario.
 *
 * `desde` y `hasta` son fechas `YYYY-MM-DD` del calendario del negocio: el
 * resultado incluye el día `hasta` completo porque el límite superior es el
 * inicio del día siguiente.
 */
export function getBusinessDateRange(
  desde: string,
  hasta: string,
): BusinessDateRange {
  return {
    start: businessDateToUtc(parseBusinessDate(desde)),
    end: businessDateToUtc(nextDay(parseBusinessDate(hasta))),
  };
}

/**
 * Interpreta `YYYY-MM-DD` como una fecha real del calendario.
 *
 * El formato lo valida el DTO (422). Esta función es la última barrera contra
 * un `2026-02-30` que `Date.UTC` normalizaría silenciosamente a marzo.
 */
export function parseBusinessDate(value: string): BusinessDateParts {
  const match = ISO_DATE_PATTERN.exec(value.trim());

  if (match === null) {
    throw new TypeError(
      `Fecha inválida: "${value}". Se esperaba el formato YYYY-MM-DD.`,
    );
  }

  const [, year, month, day] = match;
  const parts: BusinessDateParts = {
    year: Number(year),
    month: Number(month),
    day: Number(day),
  };

  assertRealDate(parts, value);

  return parts;
}

/** Día siguiente al indicado, sin depender de la zona del proceso. */
export function nextDay(parts: BusinessDateParts): BusinessDateParts {
  const next = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + 1));

  return {
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate(),
  };
}

/**
 * Instante UTC de la medianoche local de una fecha del negocio.
 *
 * El offset se resuelve con dos correcciones: la primera estima el instante
 * como si la fecha fuera UTC y la segunda ajusta el resultado al offset real
 * que la zona tenía en ese instante. Dos pasadas cubren incluso zonas con
 * cambio de horario de verano en el mismo día.
 */
export function businessDateToUtc(parts: BusinessDateParts): Date {
  const targetUtc = Date.UTC(parts.year, parts.month - 1, parts.day);
  let candidate = targetUtc;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const renderedAsUtc = formatAsUtc(new Date(candidate));
    candidate += targetUtc - renderedAsUtc;
  }

  return new Date(candidate);
}

/** Fecha del calendario del negocio para un instante dado. */
export function getBusinessDateParts(date: Date): BusinessDateParts {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new TypeError('Fecha inválida: se esperaba un Date válido.');
  }

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = new Map(parts.map(({ type, value }) => [type, value]));

  return {
    year: Number(values.get('year')),
    month: Number(values.get('month')),
    day: Number(values.get('day')),
  };
}

/** Componentes de un instante vistos como si la zona del negocio fuera UTC. */
function formatAsUtc(date: Date): number {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const values = new Map(parts.map(({ type, value }) => [type, value]));

  return Date.UTC(
    Number(values.get('year')),
    Number(values.get('month')) - 1,
    Number(values.get('day')),
    Number(values.get('hour')),
    Number(values.get('minute')),
    Number(values.get('second')),
  );
}

/**
 * Verifica que la fecha exista en el calendario gregoriano.
 *
 * `Date.UTC(2026, 1, 30)` devuelve el 2 de marzo; comparar los componentes
 * normalizados detecta ese corrimiento.
 */
function assertRealDate(parts: BusinessDateParts, source: string): void {
  const { year, month, day } = parts;

  if (
    !isInRange(month, MONTH_RANGE) ||
    !isInRange(day, DAY_RANGE) ||
    year < 1
  ) {
    throw new TypeError(`Fecha inválida: "${source}".`);
  }

  const normalized = new Date(Date.UTC(year, month - 1, day));

  if (
    normalized.getUTCFullYear() !== year ||
    normalized.getUTCMonth() !== month - 1 ||
    normalized.getUTCDate() !== day
  ) {
    throw new TypeError(`Fecha inválida: "${source}".`);
  }
}

function isInRange(
  value: number,
  range: { readonly min: number; readonly max: number },
): boolean {
  return Number.isInteger(value) && value >= range.min && value <= range.max;
}
