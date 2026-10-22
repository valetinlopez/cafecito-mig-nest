/**
 * Headers HTTP propios del backend.
 *
 * Viven en un archivo aparte porque los consumen dos piezas distintas: el
 * interceptor que los escribe y la configuración de CORS que los expone al
 * navegador. Una sola definición evita que el nombre se desincronice.
 */

/** Milisegundos que tardó la request en resolverse (D-11, opcional). */
export const RESPONSE_TIME_HEADER = 'X-Response-Time-ms';
