import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  INVALID_TOKEN_DETAIL,
  TOKEN_WITHOUT_SUBJECT_DETAIL,
  USER_NOT_FOUND_OR_INACTIVE_DETAIL,
} from '../../common/auth/auth-messages.js';
import type { AuthConfig } from '../../config/auth.config.js';
import type { Usuario } from '../../users/entities/usuario.entity.js';
import { UsersService } from '../../users/users.service.js';
import { JwtStrategy } from './jwt.strategy.js';

const AUTH_CONFIG: AuthConfig = {
  secretKey: 'test-secret-key-with-enough-length',
  algorithm: 'HS256',
  accessTokenExpiresInMinutes: 480,
};

/**
 * Validación del payload JWT (MIG-23/24).
 *
 * La firma la valida `passport-jwt`; acá se cubren las reglas propias:
 * rechazo de tokens de reseteo, `sub` obligatorio y usuario activo.
 */
describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  const usersService = {
    findById: vi.fn<UsersService['findById']>(),
  };

  const configService = {
    getOrThrow: vi.fn((key: string): AuthConfig => {
      if (key !== 'auth') {
        throw new Error(`Clave de configuración inesperada: ${key}`);
      }

      return AUTH_CONFIG;
    }),
  } as unknown as ConfigService;

  function buildUsuario(overrides: Partial<Usuario> = {}): Usuario {
    return {
      id: 1,
      nombre: 'Valentín López',
      email: 'valentin@cafecito.com',
      passwordHash: '$2b$10$hash',
      rol: 'mozo',
      activo: true,
      ...overrides,
    };
  }

  beforeEach(() => {
    strategy = new JwtStrategy(
      configService,
      usersService as unknown as UsersService,
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('devuelve el shape público del usuario autenticado', async () => {
    usersService.findById.mockResolvedValue(buildUsuario());

    const usuario = await strategy.validate({ sub: 1 });

    expect(usersService.findById).toHaveBeenCalledWith(1);
    expect(usuario).toEqual({
      id: 1,
      nombre: 'Valentín López',
      email: 'valentin@cafecito.com',
      rol: 'mozo',
      activo: true,
    });
    expect(usuario).not.toHaveProperty('passwordHash');
  });

  it('rechaza un token de reseteo para que no sirva como access token', async () => {
    await expect(
      strategy.validate({ sub: 1, purpose: 'reset' }),
    ).rejects.toThrow(new UnauthorizedException(INVALID_TOKEN_DETAIL));
    expect(usersService.findById).not.toHaveBeenCalled();
  });

  it('rechaza un token sin sub', async () => {
    await expect(strategy.validate({})).rejects.toThrow(
      new UnauthorizedException(TOKEN_WITHOUT_SUBJECT_DETAIL),
    );
  });

  it('rechaza un usuario inexistente', async () => {
    usersService.findById.mockResolvedValue(null);

    await expect(strategy.validate({ sub: 99 })).rejects.toThrow(
      new UnauthorizedException(USER_NOT_FOUND_OR_INACTIVE_DETAIL),
    );
  });

  it('rechaza un usuario inactivo', async () => {
    usersService.findById.mockResolvedValue(buildUsuario({ activo: false }));

    await expect(strategy.validate({ sub: 1 })).rejects.toThrow(
      new UnauthorizedException(USER_NOT_FOUND_OR_INACTIVE_DETAIL),
    );
  });
});
