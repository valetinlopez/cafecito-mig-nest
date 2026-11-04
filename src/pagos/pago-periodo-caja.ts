/**
 * Un pago pertenece a una caja si su fecha cae en el período de esa caja, con
 * ambos límites incluidos. Si sigue abierta, el período llega hasta `:ahora`.
 *
 * Es la regla del legacy: `pagos` no guarda la caja (ADR 0009). Requiere los
 * alias `pago` y `caja`, y el parámetro `ahora`.
 */
export const PAGO_EN_PERIODO_DE_CAJA =
  'pago.fecha >= caja.fechaApertura AND pago.fecha <= COALESCE(caja.fechaCierre, :ahora)';
