/**
 * Costo de bcrypt compartido por autenticación y el seed de desarrollo.
 *
 * El legacy usa el default de Passlib (10) y así se mantiene: los hashes del
 * seed deben poder verificarse con el backend Python durante la convivencia.
 */
export const BCRYPT_ROUNDS = 10;
