import 'reflect-metadata';

/**
 * Variables mínimas para correr los tests.
 *
 * Los e2e no se conectan a PostgreSQL salvo que se pida explícitamente con
 * `E2E_DATABASE=true`. Si el entorno ya define una variable, se respeta: así
 * `E2E_DATABASE=true DATABASE_URL=... npm run test:e2e` usa la base real.
 */
process.env.NODE_ENV ??= 'test';
process.env.DATABASE_URL ??=
  'postgresql://postgres:postgres@localhost:5432/cafecito_test';
process.env.SECRET_KEY ??= 'test-secret-key-with-enough-length';
process.env.CORS_ORIGINS ??= 'http://localhost:3000';
