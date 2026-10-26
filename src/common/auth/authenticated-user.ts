import type { Rol } from '../../users/rol.js';

/**
 * Usuario autenticado que viaja en `request.user` después del `JwtAuthGuard`.
 *
 * Es el shape público del contrato (`Usuario`), nunca la entity: no incluye
 * `password_hash` y se construye en `JwtStrategy` a partir de la fila de la
 * base. Los controllers lo reciben con `@CurrentUser()`.
 *
 * El import de `Rol` es solo de tipo: `common` no depende del runtime de
 * `users`, pero el rol tiene una única fuente de verdad (`src/users/rol.ts`,
 * constitución §10).
 */
export interface AuthenticatedUser {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
  activo: boolean;
}
