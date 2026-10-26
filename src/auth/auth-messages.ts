/**
 * Mensajes de negocio de `auth`, literales del contrato
 * (`docs/api-contract.md` §5.4 y §6.1).
 *
 * El front muestra `detail` tal cual y algunos flujos comparan el texto:
 * cambiarlos es un cambio de contrato (D-05 de `auth`).
 */

/** Login con email inexistente o contraseña incorrecta (`401`). */
export const INVALID_CREDENTIALS_DETAIL = 'Email o contraseña incorrectos';

/** Alta con un email ya registrado (`400`). */
export const EMAIL_ALREADY_REGISTERED_DETAIL = 'El email ya está registrado';

/** Perfil actualizado hacia un email de otro usuario (`400`). */
export const EMAIL_ALREADY_IN_USE_DETAIL =
  'El email ya está en uso por otro usuario';

/** Cambio de contraseña con la actual incorrecta (`400`). */
export const CURRENT_PASSWORD_INVALID_DETAIL =
  'La contraseña actual es incorrecta';

/** Token de reseteo inválido, expirado o de otro tipo (`400`). */
export const RESET_TOKEN_INVALID_DETAIL = 'Token inválido o expirado';

/** Respuesta de `POST /auth/change-password`. */
export const PASSWORD_CHANGED_MESSAGE = 'Contraseña actualizada correctamente';

/** Respuesta de `POST /auth/reset-password`. */
export const PASSWORD_RESET_MESSAGE = 'Contraseña restablecida correctamente';

/**
 * Respuesta de `POST /auth/forgot-password`. Es genérica a propósito: no
 * revela si el email existe (criterio del epic MIG-4).
 */
export const FORGOT_PASSWORD_MESSAGE =
  'Si el email está registrado, vas a recibir instrucciones para recuperar tu contraseña.';
