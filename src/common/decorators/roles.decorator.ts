import { SetMetadata } from '@nestjs/common';
import type { CustomDecorator } from '@nestjs/common';
import type { Rol } from '../../users/rol.js';

/** Clave de metadata que lee `RolesGuard`. */
export const ROLES_KEY = 'roles';

/**
 * Restringe una ruta a los roles indicados (`admin` | `mozo`).
 *
 * `@Roles('admin')` en `POST /auth/register` replica el contrato §4: el alta de
 * usuarios es administrativa y no un signup público.
 */
export const Roles = (...roles: Rol[]): CustomDecorator<string> =>
  SetMetadata(ROLES_KEY, roles);
