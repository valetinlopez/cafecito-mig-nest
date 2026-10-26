import type { Rol } from '../users/rol.js';

/** Tipo de token que devuelve `POST /auth/login` (contrato §6.1). */
export const TOKEN_TYPE = 'bearer';

/** Claim que distingue un token de reseteo de un access token. */
export const RESET_TOKEN_PURPOSE = 'reset';

/** Vigencia del token de reseteo: 15 minutos (MIG-4, `auth` D-04). */
export const RESET_TOKEN_EXPIRES_IN_SECONDS = 15 * 60;

/**
 * Payload del access token.
 *
 * Solo `sub` (id) y `rol`: el epic fija ese payload y el front no decodifica
 * nada más. Los datos del usuario se leen de la base en cada request
 * (`JwtStrategy`), así un cambio de rol o una baja aplican al instante.
 */
export interface AccessTokenPayload {
  sub: number;
  rol: Rol;
}

/** Payload del token de reseteo, no intercambiable con un access token. */
export interface ResetTokenPayload {
  sub: number;
  purpose: typeof RESET_TOKEN_PURPOSE;
}
