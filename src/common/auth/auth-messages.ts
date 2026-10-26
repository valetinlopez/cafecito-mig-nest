/**
 * Mensajes literales del contrato para el borde de seguridad
 * (`docs/api-contract.md` §5.2, §5.4).
 *
 * Viven en `common` porque los comparten el guard, la estrategia y los
 * servicios de `auth`. El front muestra `detail` tal cual y algunos flujos
 * comparan el texto: cambiarlo es un cambio de contrato (D-05 de `auth`).
 */

/** Token ausente, inválido o expirado (`401`). */
export const INVALID_TOKEN_DETAIL = 'Token inválido o expirado';

/** Token válido sin `sub`, o usuario inexistente/inactivo (`401`). */
export const TOKEN_WITHOUT_SUBJECT_DETAIL =
  'Token sin identificador de usuario';

/** Usuario inexistente o desactivado (`401`). */
export const USER_NOT_FOUND_OR_INACTIVE_DETAIL =
  'Usuario no encontrado o inactivo';

/** Autenticado sin el rol requerido (`403`). */
export const ADMIN_ROLE_REQUIRED_DETAIL = 'Se requiere rol de administrador';
