import type { Rol } from '../users/rol.js';

/** Tipo de token que devuelve `POST /auth/login` (contrato §6.1). */
export const TOKEN_TYPE = 'bearer';

/** Claim que distingue un token de reseteo de un access token. */
export const RESET_TOKEN_PURPOSE = 'password_reset';

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
  sub: string;
  rol: Rol;
}

/** Payload del token de reseteo, no intercambiable con un access token. */
export interface ResetTokenPayload {
  sub: string;
  purpose: typeof RESET_TOKEN_PURPOSE;
}

/** Convierte claims nuevos (string) y legacy (number) a un ID seguro. */
export function parseUserIdClaim(sub: unknown): number | null {
  if (typeof sub === 'number') {
    return Number.isSafeInteger(sub) && sub > 0 ? sub : null;
  }

  if (typeof sub !== 'string' || !/^[1-9]\d*$/.test(sub)) {
    return null;
  }

  const id = Number(sub);
  return Number.isSafeInteger(id) ? id : null;
}
