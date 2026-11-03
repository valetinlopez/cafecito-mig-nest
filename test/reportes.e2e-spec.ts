import { BadRequestException } from '@nestjs/common';
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
import type { ReporteVentasResponseDto } from '../src/reportes/dto/reporte-ventas-response.dto.js';
import { ReportesController } from '../src/reportes/reportes.controller.js';
import { ReportesService } from '../src/reportes/reportes.service.js';
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
const REPORTE_RESPONSE = {
  periodo: { desde: '2026-10-01', hasta: '2026-10-19' },
  resumen: {
    total_vendido: 125000,
    cantidad_cobros: 84,
    pedidos_cobrados: 80,
    ticket_promedio: 1488.1,
  },
  ventas_por_metodo: [{ metodo_pago: 'efectivo', cantidad: 40, total: 60000 }],
  productos_mas_vendidos: [
    { producto_id: 1, nombre: 'Café con leche', cantidad: 120, total: 102000 },
  ],
  mesas_utilizadas: [
    { mesa_id: 1, numero: 1, cantidad_pedidos: 18, total: 27000 },
  ],
  cajas: [
    {
      caja_id: 1,
      estado: 'cerrada',
      fecha_apertura: '2026-10-18T11:00:00.000Z',
      fecha_cierre: '2026-10-18T23:00:00.000Z',
      monto_inicial: 1000,
      ventas_efectivo: 40000,
      monto_final: 41500,
      diferencia: 500,
    },
  ],
} satisfies ReporteVentasResponseDto;

const configService = {
  getOrThrow: vi.fn((key: string): AuthConfig | typeof APP_CONFIG => {
    if (key === 'auth') return AUTH_CONFIG;
    if (key === 'app') return APP_CONFIG;
    throw new Error(`Clave de configuración inesperada: ${key}`);
  }),
} as unknown as ConfigService;

describe('ReportesController (e2e)', () => {
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
  const reportesService = {
    getReporteVentas: vi.fn<ReportesService['getReporteVentas']>(),
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
    reportesService.getReporteVentas.mockResolvedValue(REPORTE_RESPONSE);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        CommonModule,
        PassportModule,
        JwtModule.register({
          secret: SECRET_KEY,
          signOptions: { algorithm: 'HS256', expiresIn: 480 * 60 },
        }),
      ],
      controllers: [ReportesController],
      providers: [
        JwtStrategy,
        { provide: ReportesService, useValue: reportesService },
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
    const query = 'desde=2026-10-01&hasta=2026-10-19';

    await request(server)
      .get(`/api/v1/reportes/ventas?${query}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect(REPORTE_RESPONSE);
    await request(server)
      .get(`/api/v1/reportes/ventas/?${query}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect(REPORTE_RESPONSE);
  });

  it('entrega el período validado al service', async () => {
    const token = await tokenFor(admin);

    await request(server)
      .get('/api/v1/reportes/ventas?desde=2026-10-01&hasta=2026-10-19')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(reportesService.getReporteVentas).toHaveBeenCalledWith(
      expect.objectContaining({
        desde: '2026-10-01',
        hasta: '2026-10-19',
      }),
    );
  });

  it('requiere autenticación y rol admin', async () => {
    await request(server)
      .get('/api/v1/reportes/ventas?desde=2026-10-01&hasta=2026-10-19')
      .expect(401);

    const token = await tokenFor(mozo);

    await request(server)
      .get('/api/v1/reportes/ventas?desde=2026-10-01&hasta=2026-10-19')
      .set('Authorization', `Bearer ${token}`)
      .expect(403)
      .expect({ detail: 'Se requiere rol de administrador' });
  });

  it('responde 422 si falta un parámetro o el formato es inválido', async () => {
    const token = await tokenFor(admin);

    await request(server)
      .get('/api/v1/reportes/ventas?hasta=2026-10-19')
      .set('Authorization', `Bearer ${token}`)
      .expect(422)
      .expect({ detail: "Campo 'desde': es obligatorio" });

    await request(server)
      .get('/api/v1/reportes/ventas?desde=2026-10-01&hasta=19-10-2026')
      .set('Authorization', `Bearer ${token}`)
      .expect(422)
      .expect({
        detail: "Campo 'hasta': debe tener el formato YYYY-MM-DD",
      });

    expect(reportesService.getReporteVentas).not.toHaveBeenCalled();
  });

  it('propaga el 400 del service cuando el período está invertido', async () => {
    const token = await tokenFor(admin);
    reportesService.getReporteVentas.mockRejectedValueOnce(
      new BadRequestException(
        "La fecha 'desde' no puede ser posterior a 'hasta'",
      ),
    );

    await request(server)
      .get('/api/v1/reportes/ventas?desde=2026-10-19&hasta=2026-10-01')
      .set('Authorization', `Bearer ${token}`)
      .expect(400)
      .expect({
        detail: "La fecha 'desde' no puede ser posterior a 'hasta'",
      });
  });
});
