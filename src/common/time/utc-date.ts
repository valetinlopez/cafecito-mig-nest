/**
 * Conversión de fechas entre PostgreSQL y el contrato HTTP.
 *
 * Eje único: **UTC** (ADR 0003). Las columnas compartidas con el backend
 * FastAPI son `timestamp without time zone` y guardan UTC *naive*, así que el
 * backend no puede confiar en la zona del proceso para interpretarlas: el
 * proceso se fija en UTC (`pinProcessTimezone`) y estas funciones hacen
 * explícita la conversión en los dos bordes.
 *
 * | Borde            | Función                | Resultado                          |
 * | ---------------- | ---------------------- | ---------------------------------- |
 * | PostgreSQL → app | `parseUtcTimestamp`    | `Date` con el instante correcto    |
 * | app → PostgreSQL | `formatUtcTimestamp`   | `YYYY-MM-DD HH:MM:SS.mmm` en UTC   |
 * | app → contrato   | `toIsoUtc`             | `2026-10-19T20:24:10.794Z`         |
 */

const TIMESTAMP_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?$/;

const EXPLICIT_OFFSET_PATTERN = /(?:Z|[+-]\d{2}:?\d{2})$/i;

const MILLISECONDS_DIGITS = 3;

const INVALID_DATE_MESSAGE =
  'Fecha inválida: se esperaba un Date con un instante válido.';

const RANGES = {
  month: { min: 1, max: 12 },
  day: { min: 1, max: 31 },
  hour: { min: 0, max: 23 },
  minute: { min: 0, max: 59 },
  second: { min: 0, max: 59 },
} as const;

/**
 * Serializa un instante como ISO-8601 UTC con milisegundos y sufijo `Z`.
 *
 * Es la única forma permitida de exponer una fecha al contrato (D-06).
 */
export function toIsoUtc(date: Date): string {
  assertValidDate(date);
  return date.toISOString();
}

/**
 * Igual que `toIsoUtc`, pero normaliza `null`/`undefined` a `null` para
 * cumplir la regla del contrato: nulos explícitos, nunca campos omitidos.
 */
export function toIsoUtcOrNull(date: Date | null | undefined): string | null {
  if (date === null || date === undefined) {
    return null;
  }

  return toIsoUtc(date);
}

/**
 * Formatea un instante como literal de `timestamp without time zone`.
 *
 * Se envían los componentes UTC de forma explícita para que la escritura no
 * dependa de la zona configurada en el proceso ni en la sesión de PostgreSQL.
 */
export function formatUtcTimestamp(date: Date): string {
  assertValidDate(date);

  // `toISOString()` devuelve `YYYY-MM-DDTHH:MM:SS.mmmZ`: se reemplaza la `T`
  // por un espacio y se descarta la `Z`, que PostgreSQL ignoraría en un
  // `timestamp without time zone`.
  const iso = date.toISOString();

  return `${iso.slice(0, 10)} ${iso.slice(11, 23)}`;
}

/**
 * Interpreta como UTC un timestamp de PostgreSQL.
 *
 * Acepta el formato de `timestamp without time zone` (`2026-10-19 20:24:10.794`)
 * y, por robustez, un ISO con offset explícito. Un ISO sin offset se interpreta
 * como UTC, nunca como hora local.
 */
export function parseUtcTimestamp(value: string): Date {
  const normalized = value.trim();

  if (EXPLICIT_OFFSET_PATTERN.test(normalized)) {
    return toValidDate(new Date(normalized));
  }

  const match = TIMESTAMP_PATTERN.exec(normalized);

  if (match === null) {
    throw new TypeError(
      `Timestamp inválido: "${value}". Se esperaba ` +
        '"YYYY-MM-DD HH:MM:SS[.ffffff]" en UTC.',
    );
  }

  const [, year, month, day, hour, minute, second, fraction] = match;
  const milliseconds = Number(
    (fraction ?? '')
      .padEnd(MILLISECONDS_DIGITS, '0')
      .slice(0, MILLISECONDS_DIGITS),
  );

  return buildUtcDate({
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
    second: Number(second),
    milliseconds,
  });
}

function toValidDate(date: Date): Date {
  assertValidDate(date);
  return date;
}

interface UtcDateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  milliseconds: number;
}

/**
 * Construye el instante y verifica que `Date.UTC` no haya normalizado un
 * componente fuera de rango (`2026-02-30` se convertiría en marzo).
 */
function buildUtcDate(parts: UtcDateParts): Date {
  const { year, month, day, hour, minute, second, milliseconds } = parts;

  if (
    !isInRange(month, RANGES.month) ||
    !isInRange(day, RANGES.day) ||
    !isInRange(hour, RANGES.hour) ||
    !isInRange(minute, RANGES.minute) ||
    !isInRange(second, RANGES.second)
  ) {
    throw new TypeError(INVALID_DATE_MESSAGE);
  }

  const date = new Date(
    Date.UTC(year, month - 1, day, hour, minute, second, milliseconds),
  );

  const normalized =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    date.getUTCHours() === hour &&
    date.getUTCMinutes() === minute &&
    date.getUTCSeconds() === second;

  if (!normalized) {
    throw new TypeError(INVALID_DATE_MESSAGE);
  }

  return date;
}

function isInRange(
  value: number,
  range: { readonly min: number; readonly max: number },
): boolean {
  return Number.isInteger(value) && value >= range.min && value <= range.max;
}

function assertValidDate(date: Date): void {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new TypeError(INVALID_DATE_MESSAGE);
  }
}
