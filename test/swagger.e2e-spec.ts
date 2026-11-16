import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import type { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { NOT_FOUND_DETAIL, configureApp } from '../src/app.setup.js';
import { createCafecitoDataSource } from './utils/frontend-compat.fixtures.js';
import {
  asNestDataSource,
  type InMemoryDataSource,
} from './utils/in-memory-data-source.js';

interface OpenApiOperation {
  summary?: string;
  operationId?: string;
  tags?: string[];
  security?: unknown[];
  responses?: Record<string, unknown>;
}

interface OpenApiDocument {
  openapi: string;
  info: { title: string; version: string; description?: string };
  tags: Array<{ name: string; description?: string }>;
  paths: Record<string, Record<string, OpenApiOperation>>;
  components: { securitySchemes?: Record<string, unknown> };
}

const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete']);

/** Inventario del contrato §6, sin contar el health check. */
const CONTRACT_PATHS: Record<string, string[]> = {
  '/': ['get'],
  '/api/v1/auth/login': ['post'],
  '/api/v1/auth/register': ['post'],
  '/api/v1/auth/me': ['get', 'patch'],
  '/api/v1/auth/change-password': ['post'],
  '/api/v1/auth/forgot-password': ['post'],
  '/api/v1/auth/reset-password': ['post'],
  '/api/v1/mesas': ['get', 'post'],
  '/api/v1/mesas/{id}': ['get', 'patch'],
  '/api/v1/productos': ['get', 'post'],
  '/api/v1/productos/{id}': ['get', 'patch', 'delete'],
  '/api/v1/categorias': ['get'],
  '/api/v1/pedidos': ['get', 'post'],
  '/api/v1/pedidos/{id}': ['get', 'patch'],
  '/api/v1/pedidos/{id}/pago': ['post'],
  '/api/v1/caja': ['get'],
  '/api/v1/caja/historial': ['get'],
  '/api/v1/caja/{id}/movimientos': ['get'],
  '/api/v1/caja/apertura': ['post'],
  '/api/v1/caja/cierre': ['post'],
  '/api/v1/dashboard/resumen': ['get'],
  '/api/v1/empleados': ['get', 'post'],
  '/api/v1/empleados/{id}': ['patch'],
  '/api/v1/reportes/ventas': ['get'],
};

const CONTRACT_TAGS = [
  'Auth',
  'Mesas',
  'Productos',
  'Categorías',
  'Pedidos',
  'Caja',
  'Dashboard',
  'Empleados',
  'Reportes',
  'Health',
];

const PUBLIC_OPERATIONS: Array<[string, string]> = [
  ['/api/v1/auth/login', 'post'],
  ['/api/v1/auth/forgot-password', 'post'],
  ['/api/v1/auth/reset-password', 'post'],
  ['/', 'get'],
];

const PROTECTED_OPERATIONS: Array<[string, string]> = [
  ['/api/v1/mesas', 'get'],
  ['/api/v1/productos', 'post'],
  ['/api/v1/caja', 'get'],
];

function normalizePath(path: string): string {
  return path === '/' ? path : path.replace(/\/+$/, '');
}

function operations(document: OpenApiDocument): OpenApiOperation[] {
  return Object.values(document.paths).flatMap((pathItem) =>
    Object.entries(pathItem)
      .filter(([method]) => HTTP_METHODS.has(method))
      .map(([, operation]) => operation),
  );
}

/**
 * Documentación interactiva (MIG-40, spec 046).
 *
 * Levanta el `AppModule` real con el `DataSource` en memoria, igual que el
 * smoke de MIG-38: no requiere PostgreSQL y ejercita el cableado de producción
 * (`configureApp` registra Swagger antes del fallback 404).
 */
describe('Swagger / OpenAPI (e2e)', () => {
  let app: INestApplication<Server>;
  let server: Server;
  let db: InMemoryDataSource;

  beforeAll(async () => {
    db = createCafecitoDataSource();

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getDataSourceToken())
      .useValue(asNestDataSource(db))
      .compile();

    app = moduleFixture.createNestApplication();
    await configureApp(app, { corsOrigins: [] });
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('UI', () => {
    it('GET /docs sirve Swagger UI', async () => {
      const response = await request(server).get('/docs').expect(200);

      expect(response.headers['content-type']).toContain('text/html');
      expect(response.text).toContain('swagger-ui');
    });

    it('GET /docs no cae en el fallback de rutas inexistentes', async () => {
      const response = await request(server).get('/docs').expect(200);

      expect(response.body).not.toMatchObject({ detail: NOT_FOUND_DETAIL });
    });
  });

  describe('documento OpenAPI', () => {
    it('GET /docs-json devuelve un documento OpenAPI 3.x', async () => {
      const response = await request(server).get('/docs-json').expect(200);
      const document = response.body as OpenApiDocument;

      expect(response.headers['content-type']).toContain('application/json');
      expect(document.openapi).toMatch(/^3\./);
      expect(document.info.title).toBe('CafecitoApp API');
      expect(document.info.version).toBe('1.0.0');
      expect(document.info.description).toContain('{ "detail"');
    });

    it('declara los 10 tags del contrato', async () => {
      const response = await request(server).get('/docs-json').expect(200);
      const document = response.body as OpenApiDocument;

      expect(document.tags.map((tag) => tag.name)).toEqual(CONTRACT_TAGS);
    });

    it('declara el esquema de seguridad bearer', async () => {
      const response = await request(server).get('/docs-json').expect(200);
      const document = response.body as OpenApiDocument;

      expect(document.components.securitySchemes).toMatchObject({
        bearer: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      });
    });

    it('documenta el health con tag propio y respuesta', async () => {
      const response = await request(server).get('/docs-json').expect(200);
      const document = response.body as OpenApiDocument;

      expect(document.paths['/']?.get?.tags).toContain('Health');
      expect(document.paths['/']?.get?.responses?.['200']).toBeDefined();
    });

    it('documenta los 32 endpoints del contrato más el health check', async () => {
      const response = await request(server).get('/docs-json').expect(200);
      const document = response.body as OpenApiDocument;

      const paths = new Map(
        Object.entries(document.paths).map(([path, pathItem]) => [
          normalizePath(path),
          pathItem,
        ]),
      );

      for (const [path, methods] of Object.entries(CONTRACT_PATHS)) {
        const pathItem = paths.get(path);
        expect(pathItem, `falta el path ${path}`).toBeDefined();

        for (const method of methods) {
          expect(
            pathItem?.[method],
            `falta ${method.toUpperCase()} ${path}`,
          ).toBeDefined();
        }
      }

      expect(operations(document)).toHaveLength(33);
    });

    it('cada operación tiene resumen, operationId y respuesta', () => {
      return request(server)
        .get('/docs-json')
        .expect(200)
        .expect((response) => {
          const document = response.body as OpenApiDocument;

          for (const operation of operations(document)) {
            expect(operation.summary).toBeTruthy();
            expect(operation.operationId).toBeTruthy();
            expect(
              Object.keys(operation.responses ?? {}).some((status) =>
                /^2\d\d$/.test(status),
              ),
              `la operación ${operation.operationId} no tiene respuesta 2xx`,
            ).toBe(true);
          }
        });
    });

    it('deja públicos login, recuperación de contraseña y health', async () => {
      const response = await request(server).get('/docs-json').expect(200);
      const document = response.body as OpenApiDocument;

      for (const [path, method] of PUBLIC_OPERATIONS) {
        expect(
          document.paths[path]?.[method]?.security,
          `${method.toUpperCase()} ${path} no debe exigir token`,
        ).toBeUndefined();
      }
    });

    it('marca los endpoints protegidos con bearer', async () => {
      const response = await request(server).get('/docs-json').expect(200);
      const document = response.body as OpenApiDocument;

      for (const [path, method] of PROTECTED_OPERATIONS) {
        expect(
          document.paths[path]?.[method]?.security,
          `${method.toUpperCase()} ${path} debe exigir token`,
        ).toEqual([{ bearer: [] }]);
      }
    });
  });

  describe('fallback 404', () => {
    it('conserva el envelope { detail } en rutas fuera del prefijo', async () => {
      const response = await request(server).get('/desconocido').expect(404);

      expect(response.body).toEqual({ detail: NOT_FOUND_DETAIL });
    });
  });
});
