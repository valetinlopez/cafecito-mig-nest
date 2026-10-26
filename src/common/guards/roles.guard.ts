import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  ADMIN_ROLE_REQUIRED_DETAIL,
  INVALID_TOKEN_DETAIL,
} from '../auth/auth-messages.js';
import type { AuthenticatedUser } from '../auth/authenticated-user.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import type { Rol } from '../../users/rol.js';

/**
 * Guard de autorización por rol (`docs/api-contract.md` §4).
 *
 * Corre **después** de `JwtAuthGuard`, así que en una ruta protegida
 * `request.user` ya existe. Sin `@Roles()` la ruta queda disponible para
 * cualquier usuario autenticado. Las rutas `@Public()` se saltean: no hay
 * usuario contra el cual comparar roles.
 *
 * Rol insuficiente → `403` `Se requiere rol de administrador` (contrato §5.2).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic === true) {
      return true;
    }

    const roles = this.reflector.getAllAndOverride<Rol[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (roles === undefined || roles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
    }>();

    if (request.user === undefined) {
      throw new UnauthorizedException(INVALID_TOKEN_DETAIL);
    }

    if (!roles.includes(request.user.rol)) {
      throw new ForbiddenException(ADMIN_ROLE_REQUIRED_DETAIL);
    }

    return true;
  }
}
