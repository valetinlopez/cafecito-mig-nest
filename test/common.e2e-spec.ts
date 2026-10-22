import {
  BadRequestException,
  Body,
  CanActivate,
  Controller,
  ExecutionContext,
  Get,
  Injectable,
  Logger,
  NotFoundException,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { IsInt, IsString, Min } from 'class-validator';
import type { Server } from 'node:http';
import request from 'supertest';
import type { MockInstance } from 'vitest';
import { NOT_FOUND_DETAIL, configureApp } from './../src/app.setup.js';
import { CommonModule } from './../src/common/common.module.js';
import { INTERNAL_ERROR_DETAIL } from './../src/common/filters/all-exceptions.filter.js';
import { RESPONSE_TIME_HEADER } from './../src/common/http/headers.js';

/**
 * Contrato HTTP transversal (MIG-20): prefijo, CORS, header de tiempo y
 * envelope `{ detail }`.
 *
 * Se registra `CommonModule` en lugar de `AppModule` para no depender de
 * PostgreSQL. Los providers `APP_*` son los mismos que usa la aplicación real,
 * así que lo que se prueba acá es el cableado de producción.
 */

const ALLOWED_ORIGIN = 'http://localhost:3000';
const SECOND_ALLOWED_ORIGIN = 'https://app.cafecito.com';
const BLOCKED_ORIGIN = 'http://evil.example';

class ProbeDto {
  @IsString()
  nombre!: string;

  @IsInt({ message: 'debe ser un número entero' })
  @Min(18, { message: 'debe ser mayor o igual a 18' })
  edad!: number;
}

@Injectable()
class DenyGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    throw new UnauthorizedException('Token inválido o expirado');
  }
}

@Controller('probe')
class ProbeController {
  @Get('ok')
  ok(): { ok: boolean } {
    return { ok: true };
  }

  @Post('echo')
  echo(@Body() body: ProbeDto): ProbeDto {
    return body;
  }

  @Get('not-found')
  notFound(): never {
    throw new NotFoundException('Mesa no encontrada');
  }

  @Get('bad-request')
  badRequest(): never {
    throw new BadRequestException(
      "No se puede cambiar el estado de 'pagado' a 'cancelado'",
    );
  }

  @Get('boom')
  boom(): never {
    throw new Error('falla interna con un secreto');
  }

  @Get('denied')
  @UseGuards(DenyGuard)
  denied(): never {
    throw new Error('el guard debería cortar antes');
  }
}

@Controller()
class RootProbeController {
  @Get()
  root(): { status: string } {
    return { status: 'ok' };
  }
}

interface DetailBody {
  detail: string;
}

describe('Contrato HTTP transversal (e2e)', () => {
  let app: INestApplication<Server>;
  let server: Server;
  let errorLog: MockInstance<typeof Logger.prototype.error>;

  beforeAll(async () => {
    errorLog = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {
      /* silencio intencional: los 500 se verifican con el spy */
    });

    const moduleFixture = await Test.createTestingModule({
      imports: [CommonModule],
      controllers: [ProbeController, RootProbeController],
      providers: [DenyGuard],
    }).compile();

    app = moduleFixture.createNestApplication();
    await configureApp(app, {
      corsOrigins: [ALLOWED_ORIGIN, SECOND_ALLOWED_ORIGIN],
    });
    server = app.getHttpServer();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
    errorLog.mockRestore();
  });

  describe('prefijo global', () => {
    it('expone los recursos bajo /api/v1', () =>
      request(server).get('/api/v1/probe/ok').expect(200));

    it('mantiene el health fuera del prefijo', () =>
      request(server).get('/').expect(200).expect({ status: 'ok' }));

    it('responde { detail } para una ruta fuera del prefijo', async () => {
      const response = await request(server).get('/probe/ok').expect(404);
      const body = response.body as DetailBody;

      expect(body).toEqual({ detail: NOT_FOUND_DETAIL });
      expect(Object.keys(body)).toEqual(['detail']);
    });

    it('responde { detail } para un recurso inexistente dentro del prefijo', async () => {
      const response = await request(server)
        .get('/api/v1/probe/inexistente')
        .expect(404);
      const body = response.body as DetailBody;

      expect(Object.keys(body)).toEqual(['detail']);
      expect(typeof body.detail).toBe('string');
    });
  });

  describe('CORS', () => {
    it('acepta un origen configurado', async () => {
      const response = await request(server)
        .get('/api/v1/probe/ok')
        .set('Origin', ALLOWED_ORIGIN)
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe(
        ALLOWED_ORIGIN,
      );
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('rechaza un origen que no está en la lista', async () => {
      const response = await request(server)
        .get('/api/v1/probe/ok')
        .set('Origin', BLOCKED_ORIGIN)
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('responde el preflight con el origen permitido', async () => {
      const response = await request(server)
        .options('/api/v1/probe/echo')
        .set('Origin', SECOND_ALLOWED_ORIGIN)
        .set('Access-Control-Request-Method', 'POST')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBe(
        SECOND_ALLOWED_ORIGIN,
      );
    });
  });

  describe(`header ${RESPONSE_TIME_HEADER}`, () => {
    it('está en toda respuesta exitosa y es numérico', async () => {
      const response = await request(server)
        .get('/api/v1/probe/ok')
        .expect(200);

      const value = response.headers[RESPONSE_TIME_HEADER.toLowerCase()];

      expect(value).toBeDefined();
      expect(Number.isFinite(Number(value))).toBe(true);
    });

    it('está también en las respuestas de error', async () => {
      const response = await request(server)
        .get('/api/v1/probe/not-found')
        .expect(404);

      expect(
        response.headers[RESPONSE_TIME_HEADER.toLowerCase()],
      ).toBeDefined();
    });

    it('está en el 404 de una ruta fuera del prefijo', async () => {
      const response = await request(server).get('/probe/ok').expect(404);

      expect(
        response.headers[RESPONSE_TIME_HEADER.toLowerCase()],
      ).toBeDefined();
    });
  });

  describe('validación 422', () => {
    it('traduce el default de class-validator al español', async () => {
      const response = await request(server)
        .post('/api/v1/probe/echo')
        .send({ nombre: 123, edad: 20 })
        .expect(422);

      expect(response.body).toEqual({
        detail: "Campo 'nombre': debe ser un texto",
      });
    });

    it('respeta el mensaje en español definido en el DTO', async () => {
      const response = await request(server)
        .post('/api/v1/probe/echo')
        .send({ nombre: 'Ana', edad: 10 })
        .expect(422);

      expect(response.body).toEqual({
        detail: "Campo 'edad': debe ser mayor o igual a 18",
      });
    });

    it('devuelve solo la clave detail', async () => {
      const response = await request(server)
        .post('/api/v1/probe/echo')
        .send({})
        .expect(422);
      const body = response.body as DetailBody;

      expect(Object.keys(body)).toEqual(['detail']);
      expect(body.detail.startsWith("Campo '")).toBe(true);
    });

    it('descarta campos extra en lugar de rechazarlos (Pydantic)', async () => {
      const response = await request(server)
        .post('/api/v1/probe/echo')
        .send({ nombre: 'Ana', edad: 20, campo_extra: 'ignorado' })
        .expect(201);

      expect(response.body).toEqual({ nombre: 'Ana', edad: 20 });
    });
  });

  describe('envelope { detail }', () => {
    it('normaliza un 400 con el mensaje del service', async () => {
      const response = await request(server)
        .get('/api/v1/probe/bad-request')
        .expect(400);

      expect(response.body).toEqual({
        detail: "No se puede cambiar el estado de 'pagado' a 'cancelado'",
      });
    });

    it('normaliza un 404 sin campos extra de NestJS', async () => {
      const response = await request(server)
        .get('/api/v1/probe/not-found')
        .expect(404);
      const body = response.body as DetailBody;

      expect(body).toEqual({ detail: 'Mesa no encontrada' });
      expect(Object.keys(body)).toEqual(['detail']);
    });

    it('responde 500 genérico y loguea el detalle real', async () => {
      const response = await request(server)
        .get('/api/v1/probe/boom')
        .expect(500);

      expect(response.body).toEqual({ detail: INTERNAL_ERROR_DETAIL });
      expect(JSON.stringify(response.body)).not.toContain('secreto');
      expect(errorLog).toHaveBeenCalledOnce();
    });

    it('responde 401 de guard con el header de tiempo', async () => {
      const response = await request(server)
        .get('/api/v1/probe/denied')
        .expect(401);

      expect(response.body).toEqual({ detail: 'Token inválido o expirado' });
      expect(
        response.headers[RESPONSE_TIME_HEADER.toLowerCase()],
      ).toBeDefined();
    });
  });
});
