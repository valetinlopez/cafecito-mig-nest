import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedUser } from '../auth/authenticated-user.js';
import {
  ADMIN_ROLE_REQUIRED_DETAIL,
  INVALID_TOKEN_DETAIL,
} from '../auth/auth-messages.js';
import { Public } from '../decorators/public.decorator.js';
import { Roles } from '../decorators/roles.decorator.js';
import { RolesGuard } from './roles.guard.js';

/**
 * Autorización por rol (MIG-24).
 *
 * Se usa el `Reflector` real con decoradores reales: así se prueba también la
 * clave de metadata que comparten `@Roles()` y el guard.
 */
class ProbeController {
  @Roles('admin')
  adminOnly(this: void): void {}

  @Public()
  @Roles('admin')
  publicWithRoles(this: void): void {}

  open(this: void): void {}
}

function createContext(
  handler: () => void,
  user?: AuthenticatedUser,
): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => ProbeController,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

function buildUsuario(
  overrides: Partial<AuthenticatedUser> = {},
): AuthenticatedUser {
  return {
    id: 1,
    nombre: 'Valentín López',
    email: 'valentin@cafecito.com',
    rol: 'mozo',
    activo: true,
    ...overrides,
  };
}

describe('RolesGuard', () => {
  let guard: RolesGuard;

  beforeEach(() => {
    guard = new RolesGuard(new Reflector());
  });

  it('deja pasar una ruta sin @Roles', () => {
    const context = createContext(
      ProbeController.prototype.open,
      buildUsuario(),
    );

    expect(guard.canActivate(context)).toBe(true);
  });

  it('deja pasar al admin en una ruta @Roles(admin)', () => {
    const context = createContext(
      ProbeController.prototype.adminOnly,
      buildUsuario({ rol: 'admin' }),
    );

    expect(guard.canActivate(context)).toBe(true);
  });

  it('rechaza al mozo con 403 y el mensaje del contrato', () => {
    const context = createContext(
      ProbeController.prototype.adminOnly,
      buildUsuario({ rol: 'mozo' }),
    );

    expect(() => guard.canActivate(context)).toThrow(
      new ForbiddenException(ADMIN_ROLE_REQUIRED_DETAIL),
    );
  });

  it('responde 401 si no hay usuario autenticado', () => {
    const context = createContext(ProbeController.prototype.adminOnly);

    expect(() => guard.canActivate(context)).toThrow(
      new UnauthorizedException(INVALID_TOKEN_DETAIL),
    );
  });

  it('saltea la verificación de rol en una ruta @Public', () => {
    const context = createContext(
      ProbeController.prototype.publicWithRoles,
      buildUsuario({ rol: 'mozo' }),
    );

    expect(guard.canActivate(context)).toBe(true);
  });
});
