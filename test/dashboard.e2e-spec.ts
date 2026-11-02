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
import { NodeEnvironment } from '../src/config/env.helpers.js';
import { DashboardController } from '../src/dashboard/dashboard.controller.js';
import type { DashboardResumenResponseDto } from '../src/dashboard/dto/dashboard-resumen-response.dto.js';
import { DashboardService } from '../src/dashboard/dashboard.service.js';
import type { Usuario } from '../src/users/entities/usuario.entity.js';
import { UsersService } from '../src/users/users.service.js';

const SECRET_KEY = 'test-secret-key-with-enough-length';
const AUTH_CONFIG: AuthConfig = {
  secretKey: SECRET_KEY,
  algorithm: 'HS256',
  accessTokenExpiresInMinutes: 480,
};
const APP_CONFIG = {
  environment: NodeEnvironment.Test,
  isProduction: false,
  port: 3000,
  corsOrigins: [],
};
const DASHBOARD_RESPONSE = {
  ventas_dia: { total: 12500, pagos: 8 },
  mesas: { total: 12, libres: 5, ocupadas: 4, pendientes_cobro: 3 },
  pedidos_activos: {
    total: 7,
    pendientes: 2,
    en_preparacion: 2,
    listos: 1,
    entregados: 2,
  },
  caja: {
    estado: 'abierta',
    monto_inicial: 5000,
    fecha_apertura: '2026-10-19T11:00:00.000Z',
  },
  ultimos_pedidos: [
    { id: 15, mesa: 5, items: 3, total: 4500, estado: 'entregado' },
  ],
} satisfies DashboardResumenResponseDto;

const configService = {
  getOrThrow: vi.fn((key: string): AuthConfig | typeof APP_CONFIG => {
    if (key === 'auth') return AUTH_CONFIG;
    if (key === 'app') return APP_CONFIG;
    throw new Error(`Clave de configuración inesperada: ${key}`);
  }),
} as unknown as ConfigService;

describe('DashboardController (e2e)', () => {
  let app: INestApplication<Server>;
  let server: Server;
  let jwtService: JwtService;
  const admin: Usuario = {
    id: 1,
    nombre: 'Admin',
    email: 'admin@cafecito.com',
    passwordHash: 'secret',
    rol: 'admin',
    activo: true,
  };
  const mozo: Usuario = { ...admin, id: 2, rol: 'mozo' };
  const dashboardService = {
    getDashboardResumen: vi.fn<DashboardService['getDashboardResumen']>(),
  };
  const usersService = {
    findById: vi.fn<UsersService['findById']>(),
  };

  async function tokenFor(usuario: Usuario): Promise<string> {
    return jwtService.signAsync({ sub: String(usuario.id), rol: usuario.rol });
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    usersService.findById.mockImplementation((id) =>
      Promise.resolve(id === admin.id ? admin : id === mozo.id ? mozo : null),
    );
    dashboardService.getDashboardResumen.mockResolvedValue(DASHBOARD_RESPONSE);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        CommonModule,
        PassportModule,
        JwtModule.register({
          secret: SECRET_KEY,
          signOptions: { algorithm: 'HS256', expiresIn: 480 * 60 },
        }),
      ],
      controllers: [DashboardController],
      providers: [
        JwtStrategy,
        { provide: DashboardService, useValue: dashboardService },
        { provide: UsersService, useValue: usersService },
        { provide: ConfigService, useValue: configService },
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

  it('responde 200 con el shape contractual con y sin barra final', async () => {
    const token = await tokenFor(admin);

    await request(server)
      .get('/api/v1/dashboard/resumen')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect(DASHBOARD_RESPONSE);
    await request(server)
      .get('/api/v1/dashboard/resumen/')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect(DASHBOARD_RESPONSE);
  });

  it('requiere autenticación y rol admin', async () => {
    await request(server).get('/api/v1/dashboard/resumen').expect(401);
    const token = await tokenFor(mozo);

    await request(server)
      .get('/api/v1/dashboard/resumen')
      .set('Authorization', `Bearer ${token}`)
      .expect(403)
      .expect({ detail: 'Se requiere rol de administrador' });
  });
});