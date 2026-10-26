import { createParamDecorator, UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { INVALID_TOKEN_DETAIL } from '../auth/auth-messages.js';
import type { AuthenticatedUser } from '../auth/authenticated-user.js';

/**
 * Inyecta el usuario autenticado (`request.user`) en un handler.
 *
 * Lo adjunta `JwtStrategy` después de validar el Bearer token. Si el decorador
 * se usa en una ruta sin `JwtAuthGuard`, no hay usuario y se falla con `401`
 * en lugar de entregar `undefined` al controller (constitución §8: lo no
 * declarado se asume protegido).
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
    }>();

    if (request.user === undefined) {
      throw new UnauthorizedException(INVALID_TOKEN_DETAIL);
    }

    return request.user;
  },
);
