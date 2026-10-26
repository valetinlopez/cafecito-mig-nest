import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';
import { configureApp } from './../src/app.setup.js';
import { JwtStrategy } from './../src/auth/strategies/jwt.strategy.js';
import { CategoriasController } from './../src/categorias/categorias.controller.js';
import { CategoriasService } from './../src/categorias/categorias.service.js';
import { CategoriaResponseDto } from './../src/categorias/dto/categoria-response.dto.js';
import {
  INVALID_TOKEN_DETAIL,
  USER_NOT_FOUND_OR_INACTIVE_DETAIL,
} from './../src/common/auth/auth-messages.js';
import { CommonModule } from './../src/common/common.module.js';
import type { AuthConfig } from './../src/config/auth.config.js';
import type { Usuario } from './../src/users/entities/usuario.entity.js';
import { UsersService } from './../src/users/users.service.js';

const SECRET_KEY = 'test-secret-key-with-enough-length';
const AUTH_CONFIG: AuthConfig = {
  secretKey: SECRET_KEY,
  algorithm: 'HS256',
  accessTokenExpiresInMinutes: 480,
};

const configService = {
  getOrThrow: vi.fn((key: string): AuthConfig => {
    if (key !== 'auth') {
      throw new Error(`Clave de configuración inesperada: ${key}`);
    }

    return AUTH_CONFIG;
  }),
} as unknown as ConfigService;

/**
 * Contrato HTTP de `GET /api/v1/categorias/` (MIG-18).
 *
 * Verifica el contrato HTTP y la protección JWT del endpoint sin depender de
 * PostgreSQL: se usa la estrategia real y `UsersService` mockeado.
 */
describe('CategoriasController (e2e)', () => {
  let app: INestApplication<Server>;
  let server: Server;
  let jwtService: JwtService;

  const usuario: Usuario = {
    id: 1,
    nombre: 'Valentín López',
    email: 'valentin@cafecito.com',
    passwordHash: '$2b$10$hash',
    rol: 'mozo',
    activo: true,
  };

  const categoriasService = {
    getAllCategorias: vi.fn(),
  };

  const usersService = {
    findById: vi.fn<UsersService['findById']>(),
  };

  async function signAccessToken(): Promise<string> {
    return jwtService.signAsync({ sub: usuario.id, rol: usuario.rol });
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    usersService.findById.mockResolvedValue(usuario);
    categoriasService.getAllCategorias.mockResolvedValue([
      { id: 1, nombre: 'Bebidas' },
      { id: 2, nombre: 'Comida' },
    ] satisfies CategoriaResponseDto[]);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        CommonModule,
        PassportModule,
        JwtModule.register({
          secret: SECRET_KEY,
          signOptions: { algorithm: 'HS256' },
        }),
      ],
      controllers: [CategoriasController],
      providers: [
        { provide: ConfigService, useValue: configService },
        { provide: UsersService, useValue: usersService },
        JwtStrategy,
        {
          provide: CategoriasService,
          useValue: categoriasService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await configureApp(app, { corsOrigins: [] });
    server = app.getHttpServer();
    jwtService = app.get(JwtService);
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /api/v1/categorias/ responde 200 con la lista ordenada', async () => {
    const token = await signAccessToken();

    await request(server)
      .get('/api/v1/categorias/')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual([
          { id: 1, nombre: 'Bebidas' },
          { id: 2, nombre: 'Comida' },
        ]);
      });
  });

  it('responde 401 sin token', async () => {
    const response = await request(server)
      .get('/api/v1/categorias/')
      .expect(401);

    expect(response.body).toEqual({ detail: INVALID_TOKEN_DETAIL });
    expect(categoriasService.getAllCategorias).not.toHaveBeenCalled();
  });

  it('responde 401 con token inválido', async () => {
    const response = await request(server)
      .get('/api/v1/categorias/')
      .set('Authorization', 'Bearer token-invalido')
      .expect(401);

    expect(response.body).toEqual({ detail: INVALID_TOKEN_DETAIL });
  });

  it('responde 401 si el usuario autenticado está inactivo', async () => {
    usersService.findById.mockResolvedValue({ ...usuario, activo: false });
    const token = await signAccessToken();

    const response = await request(server)
      .get('/api/v1/categorias/')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);

    expect(response.body).toEqual({
      detail: USER_NOT_FOUND_OR_INACTIVE_DETAIL,
    });
  });

  it('GET sin barra final requiere token y responde igual, sin redirect', async () => {
    const token = await signAccessToken();

    await request(server)
      .get('/api/v1/categorias')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual([
          { id: 1, nombre: 'Bebidas' },
          { id: 2, nombre: 'Comida' },
        ]);
        expect(categoriasService.getAllCategorias).toHaveBeenCalledTimes(1);
      });
  });

  it('GET /api/v1/categorias/ devuelve [] cuando no hay categorías', async () => {
    categoriasService.getAllCategorias.mockResolvedValueOnce([]);
    const token = await signAccessToken();

    await request(server)
      .get('/api/v1/categorias/')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual([]);
      });
  });
});
