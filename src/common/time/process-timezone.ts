import { Logger } from '@nestjs/common';

/** Zona horaria de referencia del backend (ADR 0003). */
export const UTC_TIME_ZONE = 'UTC';

const timezoneLogger = new Logger('ZonaHoraria');

/**
 * Fija el proceso de Node en UTC antes de crear cualquier conexión.
 *
 * Node Postgres interpreta las columnas `timestamp without time zone` con la
 * zona del proceso. La base de Neon es compartida con el backend FastAPI, que
 * escribió esos valores como UTC *naive*: si el proceso corre en
 * `America/Argentina/Buenos_Aires` (UTC-3), `pg` devuelve el instante 3 horas
 * adelantado. Fijarlo en código —y no solo por la variable `TZ` del proveedor—
 * garantiza el mismo resultado en una PC local y en Render.
 *
 * Falla el arranque si el runtime no aceptó el cambio: es preferible no
 * levantar a servir fechas corridas (D-15 de `src/common/DECISIONS.md`).
 */
export function pinProcessTimezone(): void {
  const previous = process.env.TZ;
  process.env.TZ = UTC_TIME_ZONE;

  if (!hasUtcOffset()) {
    throw new Error(
      'No se pudo fijar la zona horaria del proceso en UTC. El backend ' +
        'necesita UTC para interpretar las columnas "timestamp without time ' +
        'zone" de la base compartida (ADR 0003, MIG-43).',
    );
  }

  if (previous !== undefined && previous !== UTC_TIME_ZONE) {
    timezoneLogger.warn(
      `Se ignoró TZ=${previous}: el backend opera siempre en UTC (ADR 0003).`,
    );
  }
}

/**
 * Verifica el offset real del proceso en enero y julio.
 *
 * Dos muestras descartan zonas que son UTC+0 en invierno y UTC+1 en verano
 * (por ejemplo `Europe/London`), que aplicarían el corrimiento estacional.
 */
function hasUtcOffset(): boolean {
  return [Date.UTC(2026, 0, 15, 12), Date.UTC(2026, 6, 15, 12)].every(
    (instant) => new Date(instant).getTimezoneOffset() === 0,
  );
}
