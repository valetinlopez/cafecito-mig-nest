import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedUser } from '../auth/authenticated-user.js';
import { INVALID_TOKEN_DETAIL } from '../auth/auth-messages.js';
import { Public } from '../decorators/public.decorator.js';
import { JwtAuthGuard, isPublicRoute } from './jwt-auth.guard.js';

/**
 * Guard de autenticación (MIG-24).
 *
 * El camino con token real se cubre en `test/auth.e2e-spec.ts`; acá se fijan
 * las dos reglas que no dependen de Passport: el bypass de `@Public()` y la
 * normalización del `detail` cuando no hay usuario.
 */
class ProbeController {
  @Public()
  open(this: void): void {}

  protected(this: void): void {}
}

function createContext(handler: () => void): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => ProbeController,
    switchToHttp: () => ({ getRequest: () => ({}) }),
  } as unknown as ExecutionContext;
}

function buildUsuario(): AuthenticatedUser {
  return {
    id: 1,
    nombre: 'Valentín López',
    email: 'valentin@cafecito.com',
    rol: 'mozo',
    activo: true,
  };
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard(new Reflector());
  });

  it('reconoce @Public() en el handler', () => {
    expect(
      isPublicRoute(
        new Reflector(),
        createContext(ProbeController.prototype.open),
      ),
    ).toBe(true);
  });

  it('no considera pública una ruta sin @Public()', () => {
    expect(
      isPublicRoute(
        new Reflector(),
        createContext(ProbeController.prototype.protected),
      ),
    ).toBe(false);
  });

  it('deja pasar una ruta pública sin invocar a Passport', () => {
    const context = createContext(ProbeController.prototype.open);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('responde 401 con el detail del contrato cuando no hay usuario', () => {
    expect(() =>
      guard.handleRequest<AuthenticatedUser>(
        null,
        false,
        null,
        createContext(ProbeController.prototype.protected),
      ),
    ).toThrow(new UnauthorizedException(INVALID_TOKEN_DETAIL));
  });

  it('propaga el error de la estrategia para no perder su mensaje', () => {
    const error = new UnauthorizedException('Usuario no encontrado o inactivo');

    expect(() =>
      guard.handleRequest<AuthenticatedUser>(
        error,
        false,
        null,
        createContext(ProbeController.prototype.protected),
      ),
    ).toThrow(error);
  });

  it('devuelve el usuario autenticado cuando Passport lo resolvió', () => {
    const usuario = buildUsuario();

    expect(
      guard.handleRequest<AuthenticatedUser>(
        null,
        usuario,
        null,
        createContext(ProbeController.prototype.protected),
      ),
    ).toBe(usuario);
  });
});
