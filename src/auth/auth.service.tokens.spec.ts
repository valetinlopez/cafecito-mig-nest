import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import type { TestingModule } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import { createTestModule } from '../../test/utils/test-module.helper.js';
import type { AppConfig } from '../config/app.config.js';
import { NodeEnvironment } from '../config/env.helpers.js';
import type { Usuario } from '../users/entities/usuario.entity.js';
import { UsersService } from '../users/users.service.js';
import {
  PASSWORD_RESET_MESSAGE,
  RESET_TOKEN_INVALID_DETAIL,
} from './auth-messages.js';
import { AuthService } from './auth.service.js';
import type { AccessTokenPayload, ResetTokenPayload } from './jwt-payload.js';
import {
  RESET_TOKEN_EXPIRES_IN_SECONDS,
  RESET_TOKEN_PURPOSE,
} from './jwt-payload.js';

const JWT_SECRET = 'test-secret-key-with-enough-length-for-hs256';
const ACCESS_TOKEN_EXPIRES_IN_MINUTES = 480;
const PLAIN_PASSWORD = 'secreto123';

/** Payload ya firmado: `jsonwebtoken` agrega `iat`/`exp` a los claims. */
type SignedAccessPayload = AccessTokenPayload & { iat: number; exp: number };
type SignedResetPayload = ResetTokenPayload & { iat: number; exp: number };

/**
 * Tokens JWT reales (MIG-36).
 *
 * `auth.service.spec.ts` mockea `JwtService` para aislar las reglas de negocio.
 * Acá se usa el `JwtService` real con un secreto de test para verificar lo que
 * solo se puede observar firmando y decodificando de verdad: formato de tres
 * partes, `sub`/`rol` del access token, `purpose`/`sub` del reset token y
 * vigencia. No toca PostgreSQL.
 */
describe('AuthService · tokens JWT reales', () => {
  let module: TestingModule;
  let service: AuthService;
  let jwtService: JwtService;
  let appConfig: AppConfig;

  const usersService = {
    findByEmail: vi.fn<UsersService['findByEmail']>(),
    findById: vi.fn<UsersService['findById']>(),
    existsByEmail: vi.fn<UsersService['existsByEmail']>(),
    create: vi.fn<UsersService['create']>(),
    update: vi.fn<UsersService['update']>(),
  };

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
      passwordHash: '',
      rol: 'mozo',
      activo: true,
      ...overrides,
    };
  }

  /** Firma directa para fabricar tokens vencidos o con claims a medida. */
  function signToken(
    payload: object,
    options: { expiresIn?: number } = {},
  ): Promise<string> {
    return jwtService.signAsync(payload, options);
  }

  beforeEach(async () => {
    appConfig = {
      environment: NodeEnvironment.Test,
      isProduction: false,
      port: 3000,
      corsOrigins: [],
    };

    usersService.findByEmail.mockResolvedValue(
      buildUsuario({ passwordHash: await bcrypt.hash(PLAIN_PASSWORD, 4) }),
    );

    module = await createTestModule({
      imports: [
        JwtModule.register({
          secret: JWT_SECRET,
          signOptions: {
            algorithm: 'HS256',
            expiresIn: ACCESS_TOKEN_EXPIRES_IN_MINUTES * 60,
          },
        }),
      ],
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: ConfigService, useValue: configService },
      ],
    });

    service = module.get(AuthService);
    jwtService = module.get(JwtService);
  });

  afterEach(async () => {
    vi.clearAllMocks();
    await module.close();
  });

  describe('access token', () => {
    it('emite un JWT de tres partes firmado con HS256', async () => {
      const response = await service.login({
        email: 'valentin@cafecito.com',
        password: PLAIN_PASSWORD,
      });

      expect(response.access_token.split('.')).toHaveLength(3);

      const decoded = jwtService.decode<{
        header: { alg: string; typ: string };
      }>(response.access_token, { complete: true });

      expect(decoded.header.alg).toBe('HS256');
      expect(decoded.header.typ).toBe('JWT');
    });

    it('decodifica sub y rol del usuario autenticado', async () => {
      usersService.findByEmail.mockResolvedValue(
        buildUsuario({
          id: 7,
          rol: 'admin',
          passwordHash: await bcrypt.hash(PLAIN_PASSWORD, 4),
        }),
      );

      const response = await service.login({
        email: 'valentin@cafecito.com',
        password: PLAIN_PASSWORD,
      });
      const payload = jwtService.decode<SignedAccessPayload>(
        response.access_token,
      );

      expect(payload.sub).toBe('7');
      expect(payload.rol).toBe('admin');
      expect(payload).not.toHaveProperty('purpose');
    });

    it('vence a los 480 minutos del contrato', async () => {
      const response = await service.login({
        email: 'valentin@cafecito.com',
        password: PLAIN_PASSWORD,
      });
      const payload = jwtService.decode<SignedAccessPayload>(
        response.access_token,
      );

      expect(payload.exp - payload.iat).toBe(
        ACCESS_TOKEN_EXPIRES_IN_MINUTES * 60,
      );
    });

    it('supera la verificación de firma del propio JwtService', async () => {
      const response = await service.login({
        email: 'valentin@cafecito.com',
        password: PLAIN_PASSWORD,
      });

      await expect(
        jwtService.verifyAsync<AccessTokenPayload>(response.access_token),
      ).resolves.toMatchObject({ sub: '1', rol: 'mozo' });
    });
  });

  describe('reset token', () => {
    beforeEach(() => {
      appConfig.environment = NodeEnvironment.Development;
    });

    it('emite un JWT de tres partes con purpose de reseteo', async () => {
      const response = await service.forgotPassword({
        email: 'valentin@cafecito.com',
      });
      const token = response.reset_token ?? '';

      expect(token.split('.')).toHaveLength(3);

      const payload = jwtService.decode<SignedResetPayload>(token);

      expect(payload.sub).toBe('1');
      expect(payload.purpose).toBe(RESET_TOKEN_PURPOSE);
      expect(payload).not.toHaveProperty('rol');
    });

    it('extrae el usuario_id y vence a los 15 minutos', async () => {
      usersService.findByEmail.mockResolvedValue(
        buildUsuario({ id: 42, passwordHash: '' }),
      );

      const response = await service.forgotPassword({
        email: 'valentin@cafecito.com',
      });
      const payload = jwtService.decode<SignedResetPayload>(
        response.reset_token ?? '',
      );

      expect(payload.sub).toBe('42');
      expect(payload.exp - payload.iat).toBe(RESET_TOKEN_EXPIRES_IN_SECONDS);
    });

    it('actualiza la contraseña con el token recién emitido', async () => {
      const { reset_token } = await service.forgotPassword({
        email: 'valentin@cafecito.com',
      });
      usersService.update.mockResolvedValue(buildUsuario());

      const response = await service.resetPassword({
        token: reset_token ?? '',
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

    it('rechaza un access token real como token de reseteo con 400', async () => {
      const { access_token } = await service.login({
        email: 'valentin@cafecito.com',
        password: PLAIN_PASSWORD,
      });

      await expect(
        service.resetPassword({
          token: access_token,
          password_nueva: 'nuevaClave123',
        }),
      ).rejects.toEqual(new BadRequestException(RESET_TOKEN_INVALID_DETAIL));
      expect(usersService.update).not.toHaveBeenCalled();
    });

    it('rechaza un reset token con la firma alterada', async () => {
      const { reset_token } = await service.forgotPassword({
        email: 'valentin@cafecito.com',
      });
      const [header, payload] = (reset_token ?? '').split('.');
      const tampered = `${header}.${payload}.${'A'.repeat(43)}`;

      await expect(
        service.resetPassword({
          token: tampered,
          password_nueva: 'nuevaClave123',
        }),
      ).rejects.toEqual(new BadRequestException(RESET_TOKEN_INVALID_DETAIL));
      expect(usersService.update).not.toHaveBeenCalled();
    });

    it('rechaza un reset token vencido', async () => {
      const expired = await signToken(
        { sub: '1', purpose: RESET_TOKEN_PURPOSE },
        { expiresIn: -10 },
      );

      await expect(
        service.resetPassword({
          token: expired,
          password_nueva: 'nuevaClave123',
        }),
      ).rejects.toEqual(new BadRequestException(RESET_TOKEN_INVALID_DETAIL));
      expect(usersService.update).not.toHaveBeenCalled();
    });

    it('rechaza un reset token firmado con otro secreto', async () => {
      const foreign = new JwtService({ secret: 'otro-secreto-distinto' });
      const forged = await foreign.signAsync({
        sub: '1',
        purpose: RESET_TOKEN_PURPOSE,
      });

      await expect(
        service.resetPassword({
          token: forged,
          password_nueva: 'nuevaClave123',
        }),
      ).rejects.toEqual(new BadRequestException(RESET_TOKEN_INVALID_DETAIL));
      expect(usersService.update).not.toHaveBeenCalled();
    });
  });
});
