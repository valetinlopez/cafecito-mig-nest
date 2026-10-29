export const CAJA_ESTADOS = ['abierta', 'cerrada'] as const;

export type CajaEstado = (typeof CAJA_ESTADOS)[number];
