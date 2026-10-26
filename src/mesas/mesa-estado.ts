export const MESA_ESTADOS = [
  'libre',
  'ocupada',
  'reservada',
  'pendiente_cobro',
  'en_limpieza',
] as const;

export type MesaEstado = (typeof MESA_ESTADOS)[number];
