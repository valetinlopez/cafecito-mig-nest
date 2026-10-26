import { SetMetadata } from '@nestjs/common';
import type { CustomDecorator } from '@nestjs/common';

/**
 * Clave de metadata que leen `JwtAuthGuard` y `RolesGuard`.
 *
 * Se exporta para que los guards compartan exactamente la misma clave; un
 * literal repetido en dos archivos es un bug silencioso si alguno cambia.
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marca una ruta como pública (sin JWT).
 *
 * El contrato deja cuatro rutas fuera de autenticación: `POST /auth/login`,
 * `POST /auth/forgot-password`, `POST /auth/reset-password` y `GET /`.
 *
 * Se aplica junto al guard del controller (no con `APP_GUARD` global) para que
 * la excepción quede declarada al lado del endpoint (D-08 de `auth`).
 */
export const Public = (): CustomDecorator<string> =>
  SetMetadata(IS_PUBLIC_KEY, true);
