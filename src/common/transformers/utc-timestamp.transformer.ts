import type { ValueTransformer } from 'typeorm';
import { formatUtcTimestamp, parseUtcTimestamp } from '../time/utc-date.js';

/**
 * Transformer para columnas `timestamp without time zone` de la base compartida.
 *
 * El backend FastAPI guardó esos valores como UTC *naive* (ADR 0003). `pg` los
 * interpreta con la zona del proceso, por eso el proceso se fija en UTC al
 * arrancar; además, este transformer hace explícito el eje en la escritura y
 * tolera que el driver entregue el valor como string.
 *
 * ```ts
 * @Column({ type: 'timestamp', transformer: utcTimestampTransformer })
 * fecha!: Date;
 * ```
 *
 * No se usa en `timestamptz`: esas columnas ya llevan la zona en el valor.
 */
export const utcTimestampTransformer: ValueTransformer = {
  to: (value: Date | null | undefined): string | null | undefined => {
    if (value === null || value === undefined) {
      return value;
    }

    return formatUtcTimestamp(value);
  },

  from: (value: Date | string | null | undefined): Date | null | undefined => {
    if (value === null || value === undefined) {
      return value;
    }

    if (value instanceof Date) {
      return value;
    }

    return parseUtcTimestamp(value);
  },
};
