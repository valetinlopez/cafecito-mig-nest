import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';
import { configureApp } from '../src/app.setup.js';
import { JwtStrategy } from '../src/auth/strategies/jwt.strategy.js';
import { CommonModule } from '../src/common/common.module.js';
import type { AuthConfig } from '../src/config/auth.config.js';
import { MesaResponseDto } from '../src/mesas/dto/mesa-response.dto.js';
import { MesasController } from '../src/mesas/mesas.controller.js';
import { ACTIVE_ORDERS_PORT } from '../src/mesas/active-orders.port.js';
import { MesasService } from '../src/mesas/mesas.service.js';
import type { Usuario } from '../src/users/entities/usuario.entity.js';
import { UsersService } from '../src/users/users.service.js';

const SECRET = 'test-secret-key-for-mesas-e2e';
const AUTH_CONFIG: AuthConfig = {
  secretKey: SECRET,
  algorithm: 'HS256',
  accessTokenExpiresInMinutes: 480,
};
const configService = {
  getOrThrow: vi.fn((key: string): AuthConfig => {
    if (key !== 'auth') {
      throw new Error(`Configuración inesperada: ${key}`);
    }
    return AUTH_CONFIG;
  }),
} as unknown as ConfigService;
const table: MesaResponseDto = { id: 1, numero: 1, estado: 'libre' };

describe('Mesas API (e2e)', () => {
  let app: INestApplication<Server>;
  let server: Server;
  let jwtService: JwtService;
  let usuario: Usuario;
  let mesasService: {
    findAll: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  const usersService = { findById: vi.fn<UsersService['findById']>() };

  async function signToken(): Promise<string> {
    return jwtService.signAsync({ sub: usuario.id, rol: usuario.rol });
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    usuario = {
      id: 1,
      nombre: 'Mozo de prueba',
      email: 'mozo@example.com',
      passwordHash: 'not-used',
      rol: 'mozo',
      activo: true,
    };
    usersService.findById.mockResolvedValue(usuario);
    mesasService = {
      findAll: vi.fn().mockResolvedValue([table]),
      findById: vi.fn().mockResolvedValue(table),
      create: vi.fn().mockResolvedValue(table),
      update: vi.fn().mockResolvedValue({ ...table, estado: 'ocupada' }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        CommonModule,
        PassportModule,
        JwtModule.register({
          secret: SECRET,
          signOptions: { algorithm: 'HS256' },
        }),
      ],
      controllers: [MesasController],
      providers: [
        { provide: ConfigService, useValue: configService },
        { provide: UsersService, useValue: usersService },
        { provide: MesasService, useValue: mesasService },
        {
          provide: ACTIVE_ORDERS_PORT,
          useValue: {
            hasUnpaidActiveOrderForTable: vi.fn().mockResolvedValue(false),
          },
        },
        JwtStrategy,
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

  it('requiere autenticación', async () => {
    const response = await request(server).get('/api/v1/mesas/').expect(401);
    expect(response.body).toEqual({ detail: 'Token inválido o expirado' });
    expect(mesasService.findAll).not.toHaveBeenCalled();
  });

  it('lista mesas en paths con y sin barra final', async () => {
    const token = await signToken();
    await request(server)
      .get('/api/v1/mesas')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect([table]);
    await request(server)
      .get('/api/v1/mesas/')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect([table]);
  });

  it('expone lectura, creación y cambio de estado', async () => {
    const token = await signToken();
    const authorization = `Bearer ${token}`;
    await request(server)
      .get('/api/v1/mesas/1')
      .set('Authorization', authorization)
      .expect(200)
      .expect(table);
    const forbidden = await request(server)
      .post('/api/v1/mesas')
      .set('Authorization', authorization)
      .send({ numero: 1 })
      .expect(403);
    expect(forbidden.body).toEqual({
      detail: 'Se requiere rol de administrador',
    });
    usuario.rol = 'admin';
    const adminToken = await signToken();
    await request(server)
      .post('/api/v1/mesas')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ numero: 1 })
      .expect(201)
      .expect(table);
    await request(server)
      .patch('/api/v1/mesas/1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ estado: 'ocupada' })
      .expect(200)
      .expect({ ...table, estado: 'ocupada' });
  });
});
