import type { ValueTransformer } from 'typeorm';

/**
 * Transformer para columnas `numeric`/`decimal` de PostgreSQL.
 *
 * `pg` devuelve esos valores como `string` para no perder precisión, pero el
 * contrato exige JSON `number` con 2 decimales (D-05, ADR 0004). La conversión
 * vive acá, en el borde de persistencia, y no en cada service.
 *
 * ```ts
 * @Column({ type: 'numeric', precision: 10, scale: 2, transformer: numericTransformer })
 * monto!: number;
 * ```
 *
 * Es el único transformer numérico del proyecto (common D-04): si otra entity
 * necesita decimales, importa este y no copia la lógica.
 *
 * Nota contable: `number` es IEEE-754. Para totales se calcula con precisión y
 * se convierte recién al serializar (ADR 0004).
 */
export const numericTransformer: ValueTransformer = {
  to: (value: number | null | undefined): number | null | undefined => value,

  from: (value: string | null | undefined): number | null | undefined => {
    if (value === null || value === undefined) {
      return value;
    }

    return Number(value);
  },
};
