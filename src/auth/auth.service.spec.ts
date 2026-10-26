import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { TestingModule } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import { QueryFailedError } from 'typeorm';
import { createServiceTestModule } from '../../test/utils/test-module.helper.js';
import { USER_NOT_FOUND_OR_INACTIVE_DETAIL } from '../common/auth/auth-messages.js';
import type { AppConfig } from '../config/app.config.js';
import { NodeEnvironment } from '../config/env.helpers.js';
import { UsuarioResponseDto } from '../users/dto/usuario-response.dto.js';
import type { Usuario } from '../users/entities/usuario.entity.js';
import { UsersService } from '../users/users.service.js';
import {
  CURRENT_PASSWORD_INVALID_DETAIL,
  EMAIL_ALREADY_IN_USE_DETAIL,
  EMAIL_ALREADY_REGISTERED_DETAIL,
  FORGOT_PASSWORD_MESSAGE,
  INVALID_CREDENTIALS_DETAIL,
  PASSWORD_CHANGED_MESSAGE,
  PASSWORD_RESET_MESSAGE,
  RESET_TOKEN_INVALID_DETAIL,
} from './auth-messages.js';
import { AuthService } from './auth.service.js';
import { ForgotPasswordResponseDto } from './dto/forgot-password-response.dto.js';
import { MessageResponseDto } from './dto/message-response.dto.js';
import { TokenResponseDto } from './dto/token-response.dto.js';

const PLAIN_PASSWORD = 'secreto123';
const PASSLIB_PASSWORD = 'passlib-fixture-password';
const PASSLIB_BCRYPT_HASH =
  '$2b$04$1ijdvxfE.vdUMsbzS22sXOPIR2.fYk/KkwPecjcqr6UkxMzGOe59y';

/** Error de `pg` con el `code` que TypeORM expone en `driverError`. */
function queryFailedWith(
  code: string,
): QueryFailedError<Error & { code: string }> {
  return new QueryFailedError(
    'INSERT INTO usuarios',
    [],
    Object.assign(new Error('driver error'), { code }),
  );
}

/**
 * Reglas de negocio de auth (MIG-23/25).
 *
 * Se usa bcrypt real (costo bajo) para verificar de verdad el hashing y la
 * comparación; `UsersService` y `JwtService` se mockean porque la persistencia
 * y la firma ya están cubiertas por sus propios tests.
 */
describe('AuthService', () => {
  let module: TestingModule;
  let service: AuthService;
  let appConfig: AppConfig;
  let passwordHash: string;

  const usersService = {
    findByEmail: vi.fn<UsersService['findByEmail']>(),
    findById: vi.fn<UsersService['findById']>(),
    existsByEmail: vi.fn<UsersService['existsByEmail']>(),
    create: vi.fn<UsersService['create']>(),
    update: vi.fn<UsersService['update']>(),
  };

  const jwtService = {
    signAsync: vi.fn<(payload: object, options?: object) => Promise<string>>(),
    verifyAsync: vi.fn<(token: string) => Promise<unknown>>(),
  };

  /**
   * Devuelve siempre el mismo objeto: `AuthService` guarda la referencia en el
   * constructor, así un test puede cambiar `environment` sin recrear el módulo.
   */
  const configService = {
    getOrThrow: vi.fn((key: string): AppConfig => {
      if (key !== 'app') {
        throw new Error(`Clave de configuración inesperada: ${key}`);
      }

      return appConfig;
    }),
  } as unknown as ConfigService;

  function buildUsuario(overrides: Partial<Usuario> = {}): Usuario {
    return {
      id: 1,
      nombre: 'Valentín López',
      email: 'valentin@cafecito.com',
      passwordHash,
      rol: 'mozo',
      activo: true,
      ...overrides,
    };
  }

  beforeAll(async () => {
    passwordHash = await bcrypt.hash(PLAIN_PASSWORD, 4);
  });

  beforeEach(async () => {
    appConfig = {
      environment: NodeEnvironment.Test,
      isProduction: false,
      port: 3000,
      corsOrigins: [],
    };

    ({ module, service } = await createServiceTestModule(AuthService, [
      { provide: UsersService, useValue: usersService },
      { provide: JwtService, useValue: jwtService },
      { provide: ConfigService, useValue: configService },
    ]));

    jwtService.signAsync.mockResolvedValue('signed-token');
  });

  afterEach(async () => {
    vi.clearAllMocks();
    await module.close();
  });

  describe('login', () => {
    it('devuelve el token y el usuario sin el hash', async () => {
      const usuario = buildUsuario();
      usersService.findByEmail.mockResolvedValue(usuario);

      const response = await service.login({
        email: 'valentin@cafecito.com',
        password: PLAIN_PASSWORD,
      });

      expect(usersService.findByEmail).toHaveBeenCalledWith(
        'valentin@cafecito.com',
      );
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: '1',
        rol: 'mozo',
      });
      expect(response).toBeInstanceOf(TokenResponseDto);
      expect(response.access_token).toBe('signed-token');
      expect(response.token_type).toBe('bearer');
      expect(response.usuario).toBeInstanceOf(UsuarioResponseDto);
      expect(response.usuario).toEqual({
        id: 1,
        nombre: 'Valentín López',
        email: 'valentin@cafecito.com',
        rol: 'mozo',
        activo: true,
      });
      expect(JSON.stringify(response)).not.toContain('password_hash');
    });

    it('rechaza un email inexistente con 401 sin revelar la causa', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'nadie@cafecito.com',
          password: PLAIN_PASSWORD,
        }),
      ).rejects.toEqual(new UnauthorizedException(INVALID_CREDENTIALS_DETAIL));
    });

    it('rechaza una contraseña incorrecta con 401', async () => {
      usersService.findByEmail.mockResolvedValue(buildUsuario());

      await expect(
        service.login({
          email: 'valentin@cafecito.com',
          password: 'incorrecta',
        }),
      ).rejects.toEqual(new UnauthorizedException(INVALID_CREDENTIALS_DETAIL));
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('rechaza un usuario inactivo aunque la contraseña sea correcta', async () => {
      usersService.findByEmail.mockResolvedValue(
        buildUsuario({ activo: false }),
      );

      await expect(
        service.login({
          email: 'valentin@cafecito.com',
          password: PLAIN_PASSWORD,
        }),
      ).rejects.toEqual(
        new UnauthorizedException(USER_NOT_FOUND_OR_INACTIVE_DETAIL),
      );
    });

    it('verifica hashes bcrypt $2b$ generados con Passlib', async () => {
      usersService.findByEmail.mockResolvedValue(
        buildUsuario({ passwordHash: PASSLIB_BCRYPT_HASH }),
      );

      await expect(
        service.login({
          email: 'valentin@cafecito.com',
          password: PASSLIB_PASSWORD,
        }),
      ).resolves.toBeInstanceOf(TokenResponseDto);
    });
  });

  describe('register', () => {
    it('rechaza un email ya registrado con 400', async () => {
      usersService.existsByEmail.mockResolvedValue(true);

      await expect(
        service.register({
          nombre: 'Valentín',
          email: 'valentin@cafecito.com',
          password: PLAIN_PASSWORD,
          rol: 'mozo',
        }),
      ).rejects.toEqual(
        new BadRequestException(EMAIL_ALREADY_REGISTERED_DETAIL),
      );
      expect(usersService.create).not.toHaveBeenCalled();
    });

    it('hashea la contraseña y devuelve el usuario público', async () => {
      usersService.existsByEmail.mockResolvedValue(false);
      usersService.create.mockImplementation((data) =>
        Promise.resolve(
          buildUsuario({
            nombre: data.nombre,
            email: data.email,
            passwordHash: data.passwordHash,
            rol: data.rol,
          }),
        ),
      );

      const usuario = await service.register({
        nombre: 'Valentín',
        email: 'valentin@cafecito.com',
        password: PLAIN_PASSWORD,
        rol: 'mozo',
      });

      const createArg = usersService.create.mock.calls[0]?.[0];

      expect(createArg).toBeDefined();
      expect(createArg?.passwordHash).not.toBe(PLAIN_PASSWORD);
      await expect(
        bcrypt.compare(PLAIN_PASSWORD, createArg?.passwordHash ?? ''),
      ).resolves.toBe(true);
      expect(usuario).toBeInstanceOf(UsuarioResponseDto);
      expect(usuario).not.toHaveProperty('passwordHash');
    });

    it('traduce la violación de UNIQUE de PostgreSQL a 400', async () => {
      usersService.existsByEmail.mockResolvedValue(false);
      usersService.create.mockRejectedValue(queryFailedWith('23505'));

      await expect(
        service.register({
          nombre: 'Valentín',
          email: 'valentin@cafecito.com',
          password: PLAIN_PASSWORD,
          rol: 'mozo',
        }),
      ).rejects.toEqual(
        new BadRequestException(EMAIL_ALREADY_REGISTERED_DETAIL),
      );
    });

    it('propaga otros errores de base sin convertirlos en 400', async () => {
      usersService.existsByEmail.mockResolvedValue(false);
      usersService.create.mockRejectedValue(queryFailedWith('08006'));

      await expect(
        service.register({
          nombre: 'Valentín',
          email: 'valentin@cafecito.com',
          password: PLAIN_PASSWORD,
          rol: 'mozo',
        }),
      ).rejects.toBeInstanceOf(QueryFailedError);
    });
  });

  describe('getProfile', () => {
    it('devuelve el usuario autenticado', async () => {
      usersService.findById.mockResolvedValue(buildUsuario());

      const usuario = await service.getProfile(1);

      expect(usersService.findById).toHaveBeenCalledWith(1);
      expect(usuario).toEqual({
        id: 1,
        nombre: 'Valentín López',
        email: 'valentin@cafecito.com',
        rol: 'mozo',
        activo: true,
      });
    });

    it('responde 401 si el usuario fue desactivado después de emitir el token', async () => {
      usersService.findById.mockResolvedValue(buildUsuario({ activo: false }));

      await expect(service.getProfile(1)).rejects.toEqual(
        new UnauthorizedException(USER_NOT_FOUND_OR_INACTIVE_DETAIL),
      );
    });
  });

  describe('updateProfile', () => {
    it('rechaza un email en uso por otro usuario con 400', async () => {
      usersService.findById.mockResolvedValue(buildUsuario());
      usersService.existsByEmail.mockResolvedValue(true);

      await expect(
        service.updateProfile(1, { email: 'otro@cafecito.com' }),
      ).rejects.toEqual(new BadRequestException(EMAIL_ALREADY_IN_USE_DETAIL));
      expect(usersService.existsByEmail).toHaveBeenCalledWith(
        'otro@cafecito.com',
        1,
      );
      expect(usersService.update).not.toHaveBeenCalled();
    });

    it('actualiza nombre y email y devuelve el usuario', async () => {
      usersService.findById.mockResolvedValue(buildUsuario());
      usersService.existsByEmail.mockResolvedValue(false);
      usersService.update.mockResolvedValue(
        buildUsuario({ nombre: 'Valentín G.', email: 'nuevo@cafecito.com' }),
      );

      const usuario = await service.updateProfile(1, {
        nombre: 'Valentín G.',
        email: 'nuevo@cafecito.com',
      });

      expect(usersService.update).toHaveBeenCalledWith(1, {
        nombre: 'Valentín G.',
        email: 'nuevo@cafecito.com',
      });
      expect(usuario.nombre).toBe('Valentín G.');
      expect(usuario.email).toBe('nuevo@cafecito.com');
    });
  });

  describe('changePassword', () => {
    it('rechaza la contraseña actual incorrecta con 400', async () => {
      usersService.findById.mockResolvedValue(buildUsuario());

      await expect(
        service.changePassword(1, {
          password_actual: 'incorrecta',
          password_nueva: 'nuevaClave123',
        }),
      ).rejects.toEqual(
        new BadRequestException(CURRENT_PASSWORD_INVALID_DETAIL),
      );
      expect(usersService.update).not.toHaveBeenCalled();
    });

    it('guarda el hash de la contraseña nueva', async () => {
      usersService.findById.mockResolvedValue(buildUsuario());
      usersService.update.mockResolvedValue(buildUsuario());

      const response = await service.changePassword(1, {
        password_actual: PLAIN_PASSWORD,
        password_nueva: 'nuevaClave123',
      });

      const updateArg = usersService.update.mock.calls[0]?.[1];
      const newHash = updateArg?.passwordHash ?? '';

      expect(updateArg?.passwordHash).toBeDefined();
      expect(newHash).not.toBe('nuevaClave123');
      await expect(bcrypt.compare('nuevaClave123', newHash)).resolves.toBe(
        true,
      );
      expect(response).toBeInstanceOf(MessageResponseDto);
      expect(response.message).toBe(PASSWORD_CHANGED_MESSAGE);
    });
  });

  describe('forgotPassword', () => {
    it('en development devuelve el reset_token y no revela si el email existe', async () => {
      appConfig.environment = NodeEnvironment.Development;
      usersService.findByEmail.mockResolvedValue(buildUsuario());

      const response = await service.forgotPassword({
        email: 'valentin@cafecito.com',
      });

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        { sub: '1', purpose: 'password_reset' },
        { expiresIn: 15 * 60 },
      );
      expect(response).toBeInstanceOf(ForgotPasswordResponseDto);
      expect(response.message).toBe(FORGOT_PASSWORD_MESSAGE);
      expect(response.reset_token).toBe('signed-token');
    });

    it('fuera de development devuelve reset_token null', async () => {
      usersService.findByEmail.mockResolvedValue(buildUsuario());

      const response = await service.forgotPassword({
        email: 'valentin@cafecito.com',
      });

      expect(response.reset_token).toBeNull();
      expect(response.message).toBe(FORGOT_PASSWORD_MESSAGE);
    });

    it('con un email inexistente responde igual y no firma un token', async () => {
      appConfig.environment = NodeEnvironment.Development;
      usersService.findByEmail.mockResolvedValue(null);

      const response = await service.forgotPassword({
        email: 'nadie@cafecito.com',
      });

      expect(jwtService.signAsync).not.toHaveBeenCalled();
      expect(response).toEqual({
        message: FORGOT_PASSWORD_MESSAGE,
        reset_token: null,
      });
    });
  });

  describe('resetPassword', () => {
    it('rechaza un token inválido o expirado con 400', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));

      await expect(
        service.resetPassword({
          token: 'token-invalido',
          password_nueva: 'nuevaClave123',
        }),
      ).rejects.toEqual(new BadRequestException(RESET_TOKEN_INVALID_DETAIL));
      expect(usersService.update).not.toHaveBeenCalled();
    });

    it('rechaza un access token: la firma es válida pero no tiene purpose de reset', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 1 });

      await expect(
        service.resetPassword({
          token: 'access-token',
          password_nueva: 'nuevaClave123',
        }),
      ).rejects.toEqual(new BadRequestException(RESET_TOKEN_INVALID_DETAIL));
      expect(usersService.update).not.toHaveBeenCalled();
    });

    it('actualiza la contraseña con un token de reseteo válido', async () => {
      jwtService.verifyAsync.mockResolvedValue({
        sub: '1',
        purpose: 'password_reset',
      });
      usersService.update.mockResolvedValue(buildUsuario());

      const response = await service.resetPassword({
        token: 'reset-token',
        password_nueva: 'nuevaClave123',
      });

      const updateArg = usersService.update.mock.calls[0]?.[1];

      expect(usersService.update).toHaveBeenCalledWith(1, {
        passwordHash: expect.any(String) as string,
      });
      await expect(
        bcrypt.compare('nuevaClave123', updateArg?.passwordHash ?? ''),
      ).resolves.toBe(true);
      expect(response.message).toBe(PASSWORD_RESET_MESSAGE);
    });

    it('responde 400 si el usuario del token ya no existe', async () => {
      jwtService.verifyAsync.mockResolvedValue({
        sub: 99,
        purpose: 'password_reset',
      });
      usersService.update.mockResolvedValue(null);

      await expect(
        service.resetPassword({
          token: 'reset-token',
          password_nueva: 'nuevaClave123',
        }),
      ).rejects.toEqual(new BadRequestException(RESET_TOKEN_INVALID_DETAIL));
    });

  });
});
