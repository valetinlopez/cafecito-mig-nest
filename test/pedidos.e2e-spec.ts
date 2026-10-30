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
import { PedidosController } from '../src/pedidos/pedidos.controller.js';
import type { PedidoResponseDto } from '../src/pedidos/dto/pedido-response.dto.js';
import { PedidosService } from '../src/pedidos/pedidos.service.js';
import type { Usuario } from '../src/users/entities/usuario.entity.js';
import { UsersService } from '../src/users/users.service.js';

const SECRET = 'test-secret-key-for-pedidos-e2e';
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

const pedido: PedidoResponseDto = {
  id: 12,
  estado: 'pendiente',
  total: 25,
  fecha: '2026-10-29T12:00:00.000Z',
  mesa: { id: 3, numero: 8, estado: 'ocupada' },
  usuario: {
    id: 5,
    nombre: 'Valentín',
    email: 'valentin@example.com',
    rol: 'mozo',
    activo: true,
  },
  detalles: [{ id: 11, producto_id: 4, cantidad: 1, subtotal: 25 }],
};

const usersService = { findById: vi.fn<UsersService['findById']>() };

describe('Pedidos API (e2e)', () => {
  let app: INestApplication<Server>;
  let server: Server;
  let jwtService: JwtService;
  let usuario: Usuario;
  const pedidosService = {
    findAll: vi.fn<PedidosService['findAll']>(),
    findById: vi.fn<PedidosService['findById']>(),
    createPedido: vi.fn<PedidosService['createPedido']>(),
    updatePedidoEstado: vi.fn<PedidosService['updatePedidoEstado']>(),
    cobrarPedido: vi.fn<PedidosService['cobrarPedido']>(),
  };

  async function signToken(): Promise<string> {
    return jwtService.signAsync({ sub: usuario.id, rol: usuario.rol });
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    usuario = {
      id: 5,
      nombre: 'Valentín',
      email: 'valentin@example.com',
      passwordHash: 'not-used',
      rol: 'mozo',
      activo: true,
    };
    usersService.findById.mockResolvedValue(usuario);
    pedidosService.findAll.mockResolvedValue([pedido]);
    pedidosService.findById.mockResolvedValue(pedido);
    pedidosService.createPedido.mockResolvedValue(pedido);
    pedidosService.updatePedidoEstado.mockResolvedValue({
      ...pedido,
      estado: 'en_preparacion',
    });
    pedidosService.cobrarPedido.mockResolvedValue({
      ...pedido,
      estado: 'pagado',
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        CommonModule,
        PassportModule,
        JwtModule.register({
          secret: SECRET,
          signOptions: { algorithm: 'HS256' },
        }),
      ],
      controllers: [PedidosController],
      providers: [
        { provide: ConfigService, useValue: configService },
        { provide: UsersService, useValue: usersService },
        { provide: PedidosService, useValue: pedidosService },
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

  it('requiere autenticación en todas las rutas', async () => {
    await request(server).get('/api/v1/pedidos/').expect(401);
    await request(server).get('/api/v1/pedidos/12').expect(401);
    await request(server).post('/api/v1/pedidos/').send({}).expect(401);
    await request(server).patch('/api/v1/pedidos/12').send({}).expect(401);
    await request(server).post('/api/v1/pedidos/12/pago').send({}).expect(401);
  });

  it('lista activos con y sin barra y conserva el shape contractual', async () => {
    const token = await signToken();
    for (const path of ['/api/v1/pedidos', '/api/v1/pedidos/']) {
      await request(server)
        .get(path)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect([pedido]);
    }
  });

  it('expone detalle y creación autenticados', async () => {
    const token = await signToken();
    const authorization = `Bearer ${token}`;
    await request(server)
      .get('/api/v1/pedidos/12')
      .set('Authorization', authorization)
      .expect(200)
      .expect(pedido);

    await request(server)
      .post('/api/v1/pedidos')
      .set('Authorization', authorization)
      .send({ mesa_id: 8, detalles: [{ producto_id: 4, cantidad: 1 }] })
      .expect(201)
      .expect(pedido);
    expect(pedidosService.createPedido).toHaveBeenCalledWith(
      { mesa_id: 8, detalles: [{ producto_id: 4, cantidad: 1 }] },
      5,
    );
  });

  it('actualiza estado y valida el método de pago con 422', async () => {
    usuario.rol = 'admin';
    const token = await signToken();
    const authorization = `Bearer ${token}`;
    await request(server)
      .patch('/api/v1/pedidos/12')
      .set('Authorization', authorization)
      .send({ estado: 'en_preparacion' })
      .expect(200)
      .expect({ ...pedido, estado: 'en_preparacion' });
    expect(pedidosService.updatePedidoEstado).toHaveBeenCalledWith(12, {
      estado: 'en_preparacion',
    });

    const invalid = await request(server)
      .post('/api/v1/pedidos/12/pago')
      .set('Authorization', authorization)
      .send({ metodo_pago: 'bitcoin' })
      .expect(422);
    expect(invalid.body).toHaveProperty('detail');
  });

  it('reserva el cobro a admin y responde 200 con el pedido pagado', async () => {
    const mozoToken = await signToken();
    await request(server)
      .post('/api/v1/pedidos/12/pago')
      .set('Authorization', `Bearer ${mozoToken}`)
      .send({ metodo_pago: 'efectivo' })
      .expect(403)
      .expect({ detail: 'Se requiere rol de administrador' });

    usuario.rol = 'admin';
    const adminToken = await signToken();
    await request(server)
      .post('/api/v1/pedidos/12/pago')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ metodo_pago: 'efectivo' })
      .expect(200)
      .expect({ ...pedido, estado: 'pagado' });
    expect(pedidosService.cobrarPedido).toHaveBeenCalledWith(
      12,
      { metodo_pago: 'efectivo' },
      5,
    );
  });
});
