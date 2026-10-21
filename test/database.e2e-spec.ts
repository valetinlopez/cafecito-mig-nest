import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Server } from 'node:http';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module.js';

/**
 * Smoke test del cableado completo contra PostgreSQL real.
 *
 * Es opt-in porque CI no tiene base: se habilita con `E2E_DATABASE=true` y una
 * `DATABASE_URL` (o `DB_*`) apuntando a una base descartable — nunca a la de
 * producción.
 *
 *   E2E_DATABASE=true npm run test:e2e
 */
const describeWithDatabase =
  process.env.E2E_DATABASE === 'true' ? describe : describe.skip;

describeWithDatabase('AppModule + PostgreSQL (e2e)', () => {
  let app!: INestApplication<Server>;
  let dataSource!: DataSource;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('arranca y responde el health check', async () => {
    await request(app.getHttpServer()).get('/').expect(200);
  });

  it('ejecuta una consulta contra PostgreSQL', async () => {
    const rows = await dataSource.query<[{ ok: number }]>('select 1 as ok');

    expect(rows[0]?.ok).toBe(1);
  });
});
