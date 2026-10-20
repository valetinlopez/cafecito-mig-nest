import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';

interface HealthResponse {
  status: 'ok';
  service: string;
  version: string;
  timestamp: string;
  uptime: number;
}

describe('HealthController (e2e)', () => {
  let app: INestApplication<Server>;
  let server: Server;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    server = app.getHttpServer();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/ (GET) responds with the health status', () => {
    return request(server)
      .get('/')
      .expect(200)
      .expect((response) => {
        const body = response.body as HealthResponse;

        expect(body).toMatchObject({
          status: 'ok',
          service: 'backend-nest',
        });
        expect(body.timestamp).toBeDefined();
        expect(typeof body.uptime).toBe('number');
      });
  });
});
