import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import type { Server } from 'node:http';
import request from 'supertest';
import { configureApp } from './../src/app.setup.js';
import { AuthController } from './../src/auth/auth.controller.js';
import {
  CURRENT_PASSWORD_INVALID_DETAIL,
  EMAIL_ALREADY_IN_USE_DETAIL,
  EMAIL_ALREADY_REGISTERED_DETAIL,
  FORGOT_PASSWORD_MESSAGE,
  INVALID_CREDENTIALS_DETAIL,
  PASSWORD_CHANGED_MESSAGE,
  PASSWORD_RESET_MESSAGE,
  RESET_TOKEN_INVALID_DETAIL,
} from './../src/auth/auth-messages.js';
import { AuthService } from './../src/auth/auth.service.js';
import { JwtStrategy } from './../src/auth/strategies/jwt.strategy.js';
import {
  INVALID_TOKEN_DETAIL,
  USER_NOT_FOUND_OR_INACTIVE_DETAIL,
} from './../src/common/auth/auth-messages.js';
import { CommonModule } from './../src/common/common.module.js';
import type { AppConfig } from './../src/config/app.config.js';
import type { AuthConfig } from './../src/config/auth.config.js';
import { NodeEnvironment } from './../src/config/env.helpers.js';
import type { Usuario } from './../src/users/entities/usuario.entity.js';
import { UsersService } from './../src/users/users.service.js';
import type {
  CreateUsuarioData,
  UpdateUsuarioData,
} from './../src/users/users.service.js';

const SECRET_KEY = 'test-secret-key-with-enough-length';
const PLAIN_PASSWORD = 'secreto123';
const ADMIN_ROLE_REQUIRED_DETAIL = 'Se requiere rol de administrador';

interface UsuarioBody {
  id: number;
  nombre: string;
  email: string;
  rol: string;
  activo: boolean;
}

interface TokenResponseBody {
  access_token: string;
  token_type: string;
  usuario: UsuarioBody;
}

interface DetailBody {
  detail: string;
}

const AUTH_CONFIG: AuthConfig = {
  secretKey: SECRET_KEY,
  algorithm: 'HS256',
  accessTokenExpiresInMinutes: 480,
};

const APP_CONFIG: AppConfig = {
  environment: NodeEnvironment.Test,
  isProduction: false,
  port: 3000,
  corsOrigins: [],
};

/**
 * Contrato HTTP de los 7 endpoints de auth (MIG-23).
 *
 * Usa el controller, el service y la estrategia reales con `UsersService`
 * mockeado: se valida el cableado completo (prefijo, `{ detail }`, `422`,
 * guards, JWT, bcrypt) sin depender de PostgreSQL.
 */
describe('AuthController (e2e)', () => {
  let app: INestApplication<Server>;
  let server: Server;
  let jwtService: JwtService;
  let usuarios: Usuario[];
  let nextId: number;
  let admin: Usuario;
  let mozo: Usuario;

  const usersService = {
    findByEmail: vi.fn<UsersService['findByEmail']>(),
    findById: vi.fn<UsersService['findById']>(),
    existsByEmail: vi.fn<UsersService['existsByEmail']>(),
    create: vi.fn<UsersService['create']>(),
    update: vi.fn<UsersService['update']>(),
  };

  const configService = {
    getOrThrow: vi.fn((key: string): AuthConfig | AppConfig => {
      if (key === 'auth') {
        return AUTH_CONFIG;
      }

      if (key === 'app') {
        return APP_CONFIG;
      }

      throw new Error(`Clave de configuración inesperada: ${key}`);
    }),
  } as unknown as ConfigService;

  function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  async function signAccessToken(
    id: number,
    rol: Usuario['rol'],
  ): Promise<string> {
    return jwtService.signAsync({ sub: id, rol });
  }

  async function signResetToken(id: number): Promise<string> {
    return jwtService.signAsync(
      { sub: id, purpose: 'reset' },
      { expiresIn: 15 * 60 },
    );
  }

  function buildUsuario(overrides: Partial<Usuario> = {}): Usuario {
    return {
      id: 1,
      nombre: 'Valentín López',
      email: 'valentin@cafecito.com',
      passwordHash: admin.passwordHash,
      rol: 'mozo',
      activo: true,
      ...overrides,
    };
  }

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash(PLAIN_PASSWORD, 4);

    admin = {
      id: 1,
      nombre: 'Nahuel Gauna',
      email: 'admin@cafecito.com',
      passwordHash,
      rol: 'admin',
      activo: true,
    };

    mozo = {
      id: 2,
      nombre: 'Valentín López',
      email: 'valentin@cafecito.com',
      passwordHash,
      rol: 'mozo',
      activo: true,
    };
  });

  beforeEach(async () => {
    usuarios = [
      { ...admin },
      { ...mozo },
      buildUsuario({ id: 3, email: 'inactivo@cafecito.com', activo: false }),
    ];
    nextId = 4;

    usersService.findByEmail.mockImplementation((email) =>
      Promise.resolve(
        usuarios.find((usuario) => usuario.email === normalizeEmail(email)) ??
          null,
      ),
    );
    usersService.findById.mockImplementation((id) =>
      Promise.resolve(usuarios.find((usuario) => usuario.id === id) ?? null),
    );
    usersService.existsByEmail.mockImplementation((email, excludeId) => {
      const found = usuarios.find(
        (usuario) => usuario.email === normalizeEmail(email),
      );

      return Promise.resolve(found !== undefined && found.id !== excludeId);
    });
    usersService.create.mockImplementation((data: CreateUsuarioData) => {
      const usuario: Usuario = {
        id: nextId,
        nombre: data.nombre,
        email: normalizeEmail(data.email),
        passwordHash: data.passwordHash,
        rol: data.rol,
        activo: true,
      };

      nextId += 1;
      usuarios.push(usuario);

      return Promise.resolve(usuario);
    });
    usersService.update.mockImplementation(
      (id: number, data: UpdateUsuarioData) => {
        const usuario = usuarios.find((item) => item.id === id);

        if (usuario === undefined) {
          return Promise.resolve(null);
        }

        if (data.nombre !== undefined) {
          usuario.nombre = data.nombre;
        }

        if (data.email !== undefined) {
          usuario.email = normalizeEmail(data.email);
        }

        if (data.passwordHash !== undefined) {
          usuario.passwordHash = data.passwordHash;
        }

        if (data.activo !== undefined) {
          usuario.activo = data.activo;
        }

        return Promise.resolve(usuario);
      },
    );

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        CommonModule,
        PassportModule,
        JwtModule.register({
          secret: SECRET_KEY,
          signOptions: { algorithm: 'HS256', expiresIn: 480 * 60 },
        }),
      ],
      controllers: [AuthController],
      providers: [
        AuthService,
        JwtStrategy,
        { provide: UsersService, useValue: usersService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await configureApp(app, { corsOrigins: ['http://localhost:3000'] });
    server = app.getHttpServer();
    jwtService = app.get(JwtService);
  });

  afterEach(async () => {
    vi.clearAllMocks();
    await app.close();
  });

  describe('POST /api/v1/auth/login', () => {
    it('responde 200 con el token, el usuario y el payload del contrato', async () => {
      const response = await request(server)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@cafecito.com', password: PLAIN_PASSWORD })
        .expect(200);

      const body = response.body as TokenResponseBody;

      expect(body).toMatchObject({
        token_type: 'bearer',
        usuario: {
          id: 1,
          nombre: 'Nahuel Gauna',
          email: 'admin@cafecito.com',
          rol: 'admin',
          activo: true,
        },
      });
      expect(typeof body.access_token).toBe('string');
      expect(Object.keys(body.usuario)).toEqual([
        'id',
        'nombre',
        'email',
        'rol',
        'activo',
      ]);

      const payload = await jwtService.verifyAsync<{
        sub: number;
        rol: string;
      }>(body.access_token);

      expect(payload.sub).toBe(1);
      expect(payload.rol).toBe('admin');
    });

    it('acepta el path con barra final sin redirect', async () => {
      await request(server)
        .post('/api/v1/auth/login/')
        .send({ email: 'admin@cafecito.com', password: PLAIN_PASSWORD })
        .expect(200);
    });

    it('responde 401 con el mensaje del contrato si la contraseña es incorrecta', async () => {
      const response = await request(server)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@cafecito.com', password: 'incorrecta' })
        .expect(401);

      expect(response.body).toEqual({ detail: INVALID_CREDENTIALS_DETAIL });
    });

    it('responde 401 genérico si el email no existe', async () => {
      const response = await request(server)
        .post('/api/v1/auth/login')
        .send({ email: 'nadie@cafecito.com', password: PLAIN_PASSWORD })
        .expect(401);

      expect(response.body).toEqual({ detail: INVALID_CREDENTIALS_DETAIL });
    });

    it('responde 401 si el usuario está inactivo', async () => {
      const response = await request(server)
        .post('/api/v1/auth/login')
        .send({ email: 'inactivo@cafecito.com', password: PLAIN_PASSWORD })
        .expect(401);

      expect(response.body).toEqual({
        detail: USER_NOT_FOUND_OR_INACTIVE_DETAIL,
      });
    });

    it('responde 422 con el mensaje en español si el email es inválido', async () => {
      const response = await request(server)
        .post('/api/v1/auth/login')
        .send({ email: 'no-es-email', password: PLAIN_PASSWORD })
        .expect(422);

      expect(response.body).toEqual({
        detail: "Campo 'email': debe ser un email válido",
      });
    });
  });

  describe('POST /api/v1/auth/register', () => {
    it('responde 401 sin token', async () => {
      const response = await request(server)
        .post('/api/v1/auth/register')
        .send({
          nombre: 'Nuevo',
          email: 'nuevo@cafecito.com',
          password: PLAIN_PASSWORD,
          rol: 'mozo',
        })
        .expect(401);

      expect(response.body).toEqual({ detail: INVALID_TOKEN_DETAIL });
    });

    it('responde 403 cuando el token es de un mozo', async () => {
      const token = await signAccessToken(mozo.id, mozo.rol);

      const response = await request(server)
        .post('/api/v1/auth/register')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nombre: 'Nuevo',
          email: 'nuevo@cafecito.com',
          password: PLAIN_PASSWORD,
          rol: 'mozo',
        })
        .expect(403);

      expect(response.body).toEqual({ detail: ADMIN_ROLE_REQUIRED_DETAIL });
    });

    it('responde 201 con el usuario creado y sin hash', async () => {
      const token = await signAccessToken(admin.id, admin.rol);

      const response = await request(server)
        .post('/api/v1/auth/register')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nombre: 'Nuevo Mozo',
          email: 'Nuevo@Cafecito.com',
          password: PLAIN_PASSWORD,
          rol: 'mozo',
        })
        .expect(201);

      expect(response.body).toEqual({
        id: 4,
        nombre: 'Nuevo Mozo',
        email: 'nuevo@cafecito.com',
        rol: 'mozo',
        activo: true,
      });
      expect(JSON.stringify(response.body)).not.toContain('password');
    });

    it('responde 400 si el email ya está registrado', async () => {
      const token = await signAccessToken(admin.id, admin.rol);

      const response = await request(server)
        .post('/api/v1/auth/register')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nombre: 'Duplicado',
          email: 'admin@cafecito.com',
          password: PLAIN_PASSWORD,
          rol: 'mozo',
        })
        .expect(400);

      expect(response.body).toEqual({
        detail: EMAIL_ALREADY_REGISTERED_DETAIL,
      });
    });

    it('responde 422 si el rol no es admin ni mozo', async () => {
      const token = await signAccessToken(admin.id, admin.rol);

      const response = await request(server)
        .post('/api/v1/auth/register')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nombre: 'Nuevo',
          email: 'nuevo@cafecito.com',
          password: PLAIN_PASSWORD,
          rol: 'superadmin',
        })
        .expect(422);

      expect((response.body as DetailBody).detail).toContain("Campo 'rol'");
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('responde 401 sin token', async () => {
      const response = await request(server).get('/api/v1/auth/me').expect(401);

      expect(response.body).toEqual({ detail: INVALID_TOKEN_DETAIL });
    });

    it('responde 401 con un token inválido', async () => {
      const response = await request(server)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer token-invalido')
        .expect(401);

      expect(response.body).toEqual({ detail: INVALID_TOKEN_DETAIL });
    });

    it('responde 401 si el token es de reseteo', async () => {
      const token = await signResetToken(admin.id);

      const response = await request(server)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);

      expect(response.body).toEqual({ detail: INVALID_TOKEN_DETAIL });
    });

    it('responde 401 si el usuario del token está inactivo', async () => {
      const token = await signAccessToken(3, 'mozo');

      const response = await request(server)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);

      expect(response.body).toEqual({
        detail: USER_NOT_FOUND_OR_INACTIVE_DETAIL,
      });
    });

    it('responde 200 con el usuario autenticado', async () => {
      const token = await signAccessToken(mozo.id, mozo.rol);

      const response = await request(server)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual({
        id: 2,
        nombre: 'Valentín López',
        email: 'valentin@cafecito.com',
        rol: 'mozo',
        activo: true,
      });
    });
  });

  describe('PATCH /api/v1/auth/me', () => {
    it('responde 400 si el email pertenece a otro usuario', async () => {
      const token = await signAccessToken(mozo.id, mozo.rol);

      const response = await request(server)
        .patch('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'admin@cafecito.com' })
        .expect(400);

      expect(response.body).toEqual({
        detail: EMAIL_ALREADY_IN_USE_DETAIL,
      });
    });

    it('responde 200 y actualiza el perfil', async () => {
      const token = await signAccessToken(mozo.id, mozo.rol);

      const response = await request(server)
        .patch('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ nombre: 'Valentín G. López', email: 'nuevo@cafecito.com' })
        .expect(200);

      expect(response.body).toEqual({
        id: 2,
        nombre: 'Valentín G. López',
        email: 'nuevo@cafecito.com',
        rol: 'mozo',
        activo: true,
      });
    });

    it('responde 422 si el email es inválido', async () => {
      const token = await signAccessToken(mozo.id, mozo.rol);

      const response = await request(server)
        .patch('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'no-es-email' })
        .expect(422);

      expect(response.body).toEqual({
        detail: "Campo 'email': debe ser un email válido",
      });
    });
  });

  describe('POST /api/v1/auth/change-password', () => {
    it('responde 400 si la contraseña actual es incorrecta', async () => {
      const token = await signAccessToken(mozo.id, mozo.rol);

      const response = await request(server)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          password_actual: 'incorrecta',
          password_nueva: 'nuevaClave123',
        })
        .expect(400);

      expect(response.body).toEqual({
        detail: CURRENT_PASSWORD_INVALID_DETAIL,
      });
    });

    it('responde 200 y la contraseña nueva sirve para el login', async () => {
      const token = await signAccessToken(mozo.id, mozo.rol);

      const response = await request(server)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          password_actual: PLAIN_PASSWORD,
          password_nueva: 'nuevaClave123',
        })
        .expect(200);

      expect(response.body).toEqual({ message: PASSWORD_CHANGED_MESSAGE });

      await request(server)
        .post('/api/v1/auth/login')
        .send({ email: mozo.email, password: 'nuevaClave123' })
        .expect(200);
    });

    it('responde 422 si la contraseña nueva tiene menos de 6 caracteres', async () => {
      const token = await signAccessToken(mozo.id, mozo.rol);

      const response = await request(server)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({ password_actual: PLAIN_PASSWORD, password_nueva: '123' })
        .expect(422);

      expect((response.body as DetailBody).detail).toContain(
        "Campo 'password_nueva'",
      );
    });
  });

  describe('POST /api/v1/auth/forgot-password', () => {
    it('responde 200 con reset_token null fuera de development', async () => {
      const response = await request(server)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'valentin@cafecito.com' })
        .expect(200);

      expect(response.body).toEqual({
        message: FORGOT_PASSWORD_MESSAGE,
        reset_token: null,
      });
    });

    it('responde igual cuando el email no existe (sin leaking)', async () => {
      const response = await request(server)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'nadie@cafecito.com' })
        .expect(200);

      expect(response.body).toEqual({
        message: FORGOT_PASSWORD_MESSAGE,
        reset_token: null,
      });
    });
  });

  describe('POST /api/v1/auth/reset-password', () => {
    it('responde 400 con un token inválido', async () => {
      const response = await request(server)
        .post('/api/v1/auth/reset-password')
        .send({ token: 'token-invalido', password_nueva: 'nuevaClave123' })
        .expect(400);

      expect(response.body).toEqual({ detail: RESET_TOKEN_INVALID_DETAIL });
    });

    it('responde 400 si se envía un access token en lugar del de reseteo', async () => {
      const accessToken = await signAccessToken(mozo.id, mozo.rol);

      const response = await request(server)
        .post('/api/v1/auth/reset-password')
        .send({ token: accessToken, password_nueva: 'nuevaClave123' })
        .expect(400);

      expect(response.body).toEqual({ detail: RESET_TOKEN_INVALID_DETAIL });
    });

    it('responde 200 y la contraseña restablecida sirve para el login', async () => {
      const resetToken = await signResetToken(mozo.id);

      const response = await request(server)
        .post('/api/v1/auth/reset-password')
        .send({ token: resetToken, password_nueva: 'nuevaClave123' })
        .expect(200);

      expect(response.body).toEqual({ message: PASSWORD_RESET_MESSAGE });

      await request(server)
        .post('/api/v1/auth/login')
        .send({ email: mozo.email, password: 'nuevaClave123' })
        .expect(200);
    });
  });
});
