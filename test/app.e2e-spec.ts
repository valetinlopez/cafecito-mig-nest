import { INestApplication } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Server } from 'node:http';
import request from 'supertest';
import appConfig from './../src/config/app.config.js';
import authConfig from './../src/config/auth.config.js';
import databaseConfig from './../src/config/database.config.js';
import { validateEnvironment } from './../src/config/env.validation.js';
import { HealthModule } from './../src/health/health.module.js';

interface HealthResponse {
  status: 'ok';
  service: string;
  version: string;
  timestamp: string;
  uptime: number;
}

/**
 * Health check a propósito sin base de datos (MIG-19).
 *
 * Valida el contrato HTTP sin requerir PostgreSQL en CI: `HealthModule` no
 * consulta la base. La conexión real se cubre en `database.e2e-spec.ts` cuando
 * `E2E_DATABASE=true`.
 */
describe('HealthController (e2e)', () => {
  let app: INestApplication<Server>;
  let server: Server;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [appConfig, authConfig, databaseConfig],
          validate: validateEnvironment,
        }),
        HealthModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    server = app.getHttpServer();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/ (GET) responde con el health status', () => {
    return request(server)
      .get('/')
      .expect(200)
      .expect((response) => {
        const body = response.body as HealthResponse;

        expect(body).toMatchObject({
          status: 'ok',
          service: 'backend-nest',
        });
        expect(body.timestamp).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
        );
        expect(typeof body.uptime).toBe('number');
      });
  });

  it('expone PORT como número (contrato que consume main.ts)', () => {
    const port = app.get(ConfigService).get<number>('PORT');

    expect(typeof port).toBe('number');
  });
});
