/**
 * Métodos de pago aceptados (`MetodoPago` en `docs/openapi.yaml` §11.1).
 *
 * Se modela como unión literal y no como `string` libre, igual que `Rol`: el
 * arreglo `METODOS_PAGO` es la única fuente para validar el request, tipar la
 * entity y alimentar el `enum` de Swagger.
 *
 * La columna `pagos.metodo_pago` es `varchar(30)` en el legacy. No se usa un
 * `enum` de PostgreSQL para no alterar una tabla compartida con producción
 * (constitución §4); la restricción se valida en el borde HTTP.
 */
export const METODOS_PAGO = [
  'efectivo',
  'debito',
  'credito',
  'transferencia',
  'mercado_pago',
] as const;

export type MetodoPago = (typeof METODOS_PAGO)[number];
