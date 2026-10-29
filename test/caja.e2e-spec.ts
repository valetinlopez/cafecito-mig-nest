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
import { CajaController } from '../src/caja/caja.controller.js';
import { CajaService } from '../src/caja/caja.service.js';
import type { CajaResponseDto } from '../src/caja/dto/caja-response.dto.js';
import type { MovimientoCajaResponseDto } from '../src/caja/dto/movimiento-caja-response.dto.js';
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

const CAJA_RESPONSE = {
  id: 1,
  fecha_apertura: '2026-10-19T11:00:00.000Z',
  fecha_cierre: null,
  monto_inicial: 1000,
  monto_final: null,
  estado: 'abierta',
  total_ventas: 2500,
} satisfies CajaResponseDto;
const MOVIMIENTO_RESPONSE = {
  id: 5,
  fecha: '2026-10-19T16:45:00.000Z',
  pedido_id: 12,
  mesa_numero: 4,
  monto: 950,
  metodo_pago: 'efectivo',
  usuario_nombre: null,
} satisfies MovimientoCajaResponseDto;

const configService = {
  getOrThrow: vi.fn((key: string): AuthConfig | typeof APP_CONFIG => {
    if (key === 'auth') return AUTH_CONFIG;
    if (key === 'app') return APP_CONFIG;
    throw new Error(`Clave de configuración inesperada: ${key}`);
  }),
} as unknown as ConfigService;

describe('CajaController (e2e)', () => {
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

  const cajaService = {
    getCajaAbierta: vi.fn<CajaService['getCajaAbierta']>(),
    getTodasLasCajas: vi.fn<CajaService['getTodasLasCajas']>(),
    getMovimientosCaja: vi.fn<CajaService['getMovimientosCaja']>(),
    abrirCaja: vi.fn<CajaService['abrirCaja']>(),
    cerrarCaja: vi.fn<CajaService['cerrarCaja']>(),
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
    cajaService.getCajaAbierta.mockResolvedValue(CAJA_RESPONSE);
    cajaService.getTodasLasCajas.mockResolvedValue([CAJA_RESPONSE]);
    cajaService.getMovimientosCaja.mockResolvedValue([MOVIMIENTO_RESPONSE]);
    cajaService.abrirCaja.mockResolvedValue(CAJA_RESPONSE);
    cajaService.cerrarCaja.mockResolvedValue({
      ...CAJA_RESPONSE,
      estado: 'cerrada',
      fecha_cierre: '2026-10-19T20:00:00.000Z',
      monto_final: 3500,
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        CommonModule,
        PassportModule,
        JwtModule.register({
          secret: SECRET_KEY,
          signOptions: { algorithm: 'HS256', expiresIn: 480 * 60 },
        }),
      ],
      controllers: [CajaController],
      providers: [
        JwtStrategy,
        { provide: CajaService, useValue: cajaService },
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

  it('mantiene los cinco endpoints, sus status y el shape compatible con el front', async () => {
    const token = await tokenFor(admin);

    await request(server)
      .get('/api/v1/caja/')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect(CAJA_RESPONSE);
    await request(server)
      .get('/api/v1/caja')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    await request(server)
      .get('/api/v1/caja/historial')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect([CAJA_RESPONSE]);
    await request(server)
      .get('/api/v1/caja/1/movimientos')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect([MOVIMIENTO_RESPONSE]);
    await request(server)
      .post('/api/v1/caja/apertura')
      .set('Authorization', `Bearer ${token}`)
      .send({ monto_inicial: 1000 })
      .expect(201)
      .expect(CAJA_RESPONSE);
    await request(server)
      .post('/api/v1/caja/cierre')
      .set('Authorization', `Bearer ${token}`)
      .send({ monto_final: 3500 })
      .expect(200)
      .expect({
        ...CAJA_RESPONSE,
        estado: 'cerrada',
        fecha_cierre: '2026-10-19T20:00:00.000Z',
        monto_final: 3500,
      });
  });

  it('responde literal JSON null cuando no hay caja abierta', async () => {
    cajaService.getCajaAbierta.mockResolvedValue(null);
    const token = await tokenFor(admin);

    await request(server)
      .get('/api/v1/caja/')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((response) => {
        expect(response.text).toBe('null');
      });
  });

  it('requiere token válido y rol admin', async () => {
    await request(server).get('/api/v1/caja/').expect(401);
    const token = await tokenFor(mozo);

    await request(server)
      .get('/api/v1/caja/')
      .set('Authorization', `Bearer ${token}`)
      .expect(403)
      .expect({ detail: 'Se requiere rol de administrador' });
  });

  it('valida montos y el id de caja con respuesta 422', async () => {
    const token = await tokenFor(admin);

    await request(server)
      .post('/api/v1/caja/apertura')
      .set('Authorization', `Bearer ${token}`)
      .send({ monto_inicial: '1000' })
      .expect(422)
      .expect(({ body }) => {
        expect(body).toHaveProperty('detail');
      });
    await request(server)
      .get('/api/v1/caja/no-es-id/movimientos')
      .set('Authorization', `Bearer ${token}`)
      .expect(422);
  });
});
