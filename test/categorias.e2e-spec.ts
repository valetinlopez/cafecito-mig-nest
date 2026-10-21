import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Server } from 'node:http';
import request from 'supertest';
import { CategoriasController } from './../src/categorias/categorias.controller.js';
import { CategoriasService } from './../src/categorias/categorias.service.js';
import { CategoriaResponseDto } from './../src/categorias/dto/categoria-response.dto.js';

/**
 * Contrato HTTP de `GET /api/v1/categorias/` (MIG-18).
 *
 * Usa un `CategoriasService` mockeado para verificar path, prefijo global,
 * equivalencia con/sin barra final (D-04) y shape de respuesta, sin depender
 * de PostgreSQL ni de MIG-19.
 */
describe('CategoriasController (e2e)', () => {
  let app: INestApplication<Server>;
  let server: Server;

  const categoriasService = {
    getAllCategorias: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    categoriasService.getAllCategorias.mockResolvedValue([
      { id: 1, nombre: 'Bebidas' },
      { id: 2, nombre: 'Comida' },
    ] satisfies CategoriaResponseDto[]);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [CategoriasController],
      providers: [
        {
          provide: CategoriasService,
          useValue: categoriasService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1', { exclude: ['/'] });
    await app.init();
    server = app.getHttpServer();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /api/v1/categorias/ responde 200 con la lista ordenada', () => {
    return request(server)
      .get('/api/v1/categorias/')
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual([
          { id: 1, nombre: 'Bebidas' },
          { id: 2, nombre: 'Comida' },
        ]);
      });
  });

  it('GET /api/v1/categorias (sin barra final) responde igual, sin redirect', () => {
    return request(server)
      .get('/api/v1/categorias')
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual([
          { id: 1, nombre: 'Bebidas' },
          { id: 2, nombre: 'Comida' },
        ]);
        expect(categoriasService.getAllCategorias).toHaveBeenCalledTimes(1);
      });
  });

  it('GET /api/v1/categorias/ devuelve [] cuando no hay categorías', async () => {
    categoriasService.getAllCategorias.mockResolvedValueOnce([]);

    await request(server)
      .get('/api/v1/categorias/')
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual([]);
      });
  });
});
