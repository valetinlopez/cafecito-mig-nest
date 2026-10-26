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
import type { Producto } from '../src/productos/entities/producto.entity.js';
import type { ProductoResponseDto } from '../src/productos/dto/producto-response.dto.js';
import { ProductosController } from '../src/productos/productos.controller.js';
import { ProductosService } from '../src/productos/productos.service.js';
import type { Usuario } from '../src/users/entities/usuario.entity.js';
import { UsersService } from '../src/users/users.service.js';

const SECRET = 'test-secret-key-for-productos-e2e';
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

const product: ProductoResponseDto = {
  id: 1,
  nombre: 'Café con leche',
  descripcion: null,
  precio: 850,
  stock: 10,
  stock_minimo: 5,
  disponible: true,
  categoria: { id: 1, nombre: 'Bebidas' },
};
const productEntity: Producto = {
  id: product.id,
  nombre: product.nombre,
  descripcion: product.descripcion,
  precio: String(product.precio),
  stock: product.stock,
  stockMinimo: product.stock_minimo,
  disponible: product.disponible,
  categoriaId: product.categoria.id,
  categoria: product.categoria,
};

describe('Productos API (e2e)', () => {
  let app: INestApplication<Server>;
  let server: Server;
  let jwtService: JwtService;
  let usuario: Usuario;
  const productosService = {
    findAll: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };
  const usersService = { findById: vi.fn<UsersService['findById']>() };

  async function signToken(): Promise<string> {
    return jwtService.signAsync({ sub: usuario.id, rol: usuario.rol });
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    usuario = {
      id: 1,
      nombre: 'Usuario de prueba',
      email: 'usuario@example.com',
      passwordHash: 'not-used',
      rol: 'mozo',
      activo: true,
    };
    usersService.findById.mockResolvedValue(usuario);
    productosService.findAll.mockResolvedValue([productEntity]);
    productosService.findById.mockResolvedValue(productEntity);
    productosService.create.mockResolvedValue(productEntity);
    productosService.update.mockResolvedValue({ ...productEntity, stock: 11 });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        CommonModule,
        PassportModule,
        JwtModule.register({
          secret: SECRET,
          signOptions: { algorithm: 'HS256' },
        }),
      ],
      controllers: [ProductosController],
      providers: [
        { provide: ConfigService, useValue: configService },
        { provide: UsersService, useValue: usersService },
        { provide: ProductosService, useValue: productosService },
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
    const response = await request(server).get('/api/v1/productos/').expect(401);
    expect(response.body).toEqual({ detail: 'Token inválido o expirado' });
    expect(productosService.findAll).not.toHaveBeenCalled();
  });

  it('permite GET con y sin barra, manteniendo precio como JSON number', async () => {
    const token = await signToken();
    for (const path of ['/api/v1/productos', '/api/v1/productos/']) {
      const response = await request(server)
        .get(path)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      const body = response.body as ProductoResponseDto[];
      expect(body).toEqual([product]);
      expect(typeof body[0]?.precio).toBe('number');
    }
  });

  it('restringe escrituras a admin y expone acceso CRUD parcial', async () => {
    const mozoToken = await signToken();
    const forbidden = await request(server)
      .post('/api/v1/productos')
      .set('Authorization', `Bearer ${mozoToken}`)
      .send({ nombre: 'Café', precio: 850, categoria_id: 1 })
      .expect(403);
    expect(forbidden.body).toEqual({
      detail: 'Se requiere rol de administrador',
    });

    usuario.rol = 'admin';
    const adminToken = await signToken();
    const authorization = `Bearer ${adminToken}`;
    await request(server)
      .post('/api/v1/productos')
      .set('Authorization', authorization)
      .send({ nombre: 'Café', precio: 850, categoria_id: 1 })
      .expect(201)
      .expect(product);
    await request(server)
      .patch('/api/v1/productos/1')
      .set('Authorization', authorization)
      .send({ stock: 11 })
      .expect(200)
      .expect({ ...product, stock: 11 });
    await request(server)
      .get('/api/v1/productos/1')
      .set('Authorization', authorization)
      .expect(200)
      .expect(product);
  });
});