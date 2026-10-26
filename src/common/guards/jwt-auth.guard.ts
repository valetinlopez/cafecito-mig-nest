import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import type { Observable } from 'rxjs';
import { INVALID_TOKEN_DETAIL } from '../auth/auth-messages.js';
import type { AuthenticatedUser } from '../auth/authenticated-user.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

/**
 * Guard de autenticación JWT (`docs/api-contract.md` §5.4).
 *
 * - `@Public()` → deja pasar sin token (login, forgot/reset-password).
 * - Sin header, firma inválida o token expirado → `401`
 *   `Token inválido o expirado`.
 * - Token con `purpose: reset` → lo rechaza `JwtStrategy`, para que un token de
 *   reseteo no sirva como access token (criterio del epic MIG-4).
 *
 * Se aplica con `@UseGuards` por controller, nunca con `APP_GUARD` global: un
 * guard global exige auditar todas las rutas públicas antes de activarlo
 * (D-02 de `common`, D-08 de `auth`).
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  override canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    if (isPublicRoute(this.reflector, context)) {
      return true;
    }

    return super.canActivate(context);
  }

  /**
   * Normaliza cualquier fallo de Passport al `detail` del contrato. Un error
   * lanzado por la estrategia (usuario inactivo, token sin `sub`) se propaga
   * intacto para no perder su mensaje específico.
   */
  override handleRequest<TUser = AuthenticatedUser>(
    err: unknown,
    user: TUser | false | null,
    _info: unknown,
    _context: ExecutionContext,
    _status?: unknown,
  ): TUser {
    if (err !== null && err !== undefined) {
      throw err instanceof Error
        ? err
        : new UnauthorizedException(INVALID_TOKEN_DETAIL);
    }

    if (user === null || user === undefined || user === false) {
      throw new UnauthorizedException(INVALID_TOKEN_DETAIL);
    }

    return user;
  }
}

/** `@Public()` se puede declarar en el handler o en el controller. */
export function isPublicRoute(
  reflector: Reflector,
  context: ExecutionContext,
): boolean {
  return (
    reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) === true
  );
}
