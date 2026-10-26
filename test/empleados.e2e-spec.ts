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
import { CommonModule } from './../src/common/common.module.js';
import type { AuthConfig } from './../src/config/auth.config.js';
import { NodeEnvironment } from './../src/config/env.helpers.js';
import { EmpleadosController } from './../src/empleados/empleados.controller.js';
import { EmpleadosService } from './../src/empleados/empleados.service.js';
import type { Usuario } from './../src/users/entities/usuario.entity.js';
import { UsersService } from './../src/users/users.service.js';
import type {
  CreateUsuarioData,
  UpdateUsuarioData,
} from './../src/users/users.service.js';

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

interface UsuarioResponseBody {
  id: number;
  nombre: string;
  email: string;
  rol: string;
  activo: boolean;
}

const configService = {
  getOrThrow: vi.fn((key: string): AuthConfig | typeof APP_CONFIG => {
    if (key === 'auth') return AUTH_CONFIG;
    if (key === 'app') return APP_CONFIG;
    throw new Error(`Clave de configuración inesperada: ${key}`);
  }),
} as unknown as ConfigService;

describe('EmpleadosController (e2e)', () => {
  let app: INestApplication<Server>;
  let server: Server;
  let jwtService: JwtService;
  let usuarios: Usuario[];
  let nextId: number;

  const usersService = {
    findAll: vi.fn<UsersService['findAll']>(),
    findById: vi.fn<UsersService['findById']>(),
    existsByEmail: vi.fn<UsersService['existsByEmail']>(),
    create: vi.fn<UsersService['create']>(),
    update: vi.fn<UsersService['update']>(),
  };

  function buildUsuario(overrides: Partial<Usuario> = {}): Usuario {
    return {
      id: 1,
      nombre: 'Admin',
      email: 'admin@cafecito.com',
      passwordHash: '$2b$04$synthetic-test-hash',
      rol: 'admin',
      activo: true,
      ...overrides,
    };
  }

  async function tokenFor(usuario: Usuario): Promise<string> {
    return jwtService.signAsync({ sub: String(usuario.id), rol: usuario.rol });
  }

  beforeEach(async () => {
    usuarios = [
      buildUsuario(),
      buildUsuario({
        id: 2,
        nombre: 'Valentín',
        email: 'valentin@cafecito.com',
        rol: 'mozo',
      }),
    ];
    nextId = 3;

    usersService.findAll.mockImplementation(() => Promise.resolve([...usuarios]));
    usersService.findById.mockImplementation((id) =>
      Promise.resolve(usuarios.find((usuario) => usuario.id === id) ?? null),
    );
    usersService.existsByEmail.mockImplementation((email, excludeId) =>
      Promise.resolve(
        usuarios.some(
          (usuario) =>
            usuario.email === email.trim().toLowerCase() &&
            usuario.id !== excludeId,
        ),
      ),
    );
    usersService.create.mockImplementation((data: CreateUsuarioData) => {
      const usuario = buildUsuario({
        id: nextId,
        nombre: data.nombre,
        email: data.email.trim().toLowerCase(),
        passwordHash: data.passwordHash,
        rol: data.rol,
      });
      nextId += 1;
      usuarios.push(usuario);
      return Promise.resolve(usuario);
    });
    usersService.update.mockImplementation(
      (id: number, data: UpdateUsuarioData) => {
        const usuario = usuarios.find((item) => item.id === id);
        if (usuario === undefined) return Promise.resolve(null);
        if (data.nombre !== undefined) usuario.nombre = data.nombre;
        if (data.email !== undefined) {
          usuario.email = data.email.trim().toLowerCase();
        }
        if (data.activo !== undefined) usuario.activo = data.activo;
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
      controllers: [EmpleadosController],
      providers: [
        EmpleadosService,
        JwtStrategy,
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
    vi.clearAllMocks();
    await app.close();
  });

  it('lista usuarios incluyendo admins y acepta la ruta con y sin barra final', async () => {
    const token = await tokenFor(usuarios[0]);

    await request(server)
      .get('/api/v1/empleados/')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((response) => {
        const body = response.body as UsuarioResponseBody[];
        expect(body).toHaveLength(2);
        expect(body.map((usuario) => usuario.id)).toEqual([1, 2]);
        expect(JSON.stringify(body)).not.toContain('passwordHash');
      });

    await request(server)
      .get('/api/v1/empleados')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('rechaza el listado sin token y con token de mozo', async () => {
    await request(server).get('/api/v1/empleados/').expect(401);
    const token = await tokenFor(usuarios[1]);
    await request(server)
      .get('/api/v1/empleados/')
      .set('Authorization', `Bearer ${token}`)
      .expect(403)
      .expect({ detail: 'Se requiere rol de administrador' });
  });

  it('crea empleado como mozo y no expone el password hash', async () => {
    const token = await tokenFor(usuarios[0]);

    await request(server)
      .post('/api/v1/empleados/')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nombre: 'Nuevo empleado',
        email: 'nuevo@cafecito.com',
        password: 'secreto123',
        rol: 'admin',
      })
      .expect(201)
      .expect((response) => {
        const body = response.body as UsuarioResponseBody;
        expect(body).toMatchObject({
          id: 3,
          nombre: 'Nuevo empleado',
          email: 'nuevo@cafecito.com',
          rol: 'mozo',
          activo: true,
        });
        expect(body).not.toHaveProperty('password_hash');
      });
  });

  it('rechaza auto-desactivación y devuelve 404 para id inexistente', async () => {
    const token = await tokenFor(usuarios[0]);

    await request(server)
      .patch('/api/v1/empleados/1')
      .set('Authorization', `Bearer ${token}`)
      .send({ activo: false })
      .expect(400)
      .expect({ detail: 'No podés desactivar tu propio usuario' });

    await request(server)
      .patch('/api/v1/empleados/99')
      .set('Authorization', `Bearer ${token}`)
      .send({ activo: false })
      .expect(404)
      .expect({ detail: 'Empleado no encontrado' });
  });

  it('responde 422 si el id de path no es entero', async () => {
    const token = await tokenFor(usuarios[0]);

    await request(server)
      .patch('/api/v1/empleados/no-es-id')
      .set('Authorization', `Bearer ${token}`)
      .send({ activo: false })
      .expect(422)
      .expect({ detail: "Campo 'id': debe ser un número entero" });
  });
});
