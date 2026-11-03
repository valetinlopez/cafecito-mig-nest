import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import bcrypt from 'bcrypt';
import type { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { Caja } from '../src/caja/entities/caja.entity.js';
import { Mesa } from '../src/mesas/entities/mesa.entity.js';
import { Pago } from '../src/pagos/entities/pago.entity.js';
import { DetallePedido } from '../src/pedidos/entities/detalle-pedido.entity.js';
import { Producto } from '../src/productos/entities/producto.entity.js';
import {
  createCafecitoDataSource,
  PASSWORD_SEED,
  seedCafecito,
} from './utils/frontend-compat.fixtures.js';
import {
  API_ERROR,
  arrayOf,
  CAJA,
  CATEGORIA,
  DASHBOARD_RESUMEN,
  expectFrontendShape,
  FORGOT_PASSWORD_RESPONSE,
  MESA,
  MESSAGE_RESPONSE,
  MOVIMIENTO_CAJA,
  PEDIDO,
  PRODUCTO,
  REPORTE_VENTAS,
  TOKEN_RESPONSE,
  USUARIO,
} from './utils/frontend-shapes.js';
import {
  asNestDataSource,
  type InMemoryDataSource,
} from './utils/in-memory-data-source.js';

const API = '/api/v1';
const ADMIN = 'admin@cafecito.com';
const MOZO = 'mozo@cafecito.com';

interface PedidoBody {
  id: number;
  estado: string;
  total: number;
  mesa: { estado: string };
}

/**
 * Smoke de compatibilidad con el frontend (MIG-38, spec 038).
 *
 * Levanta el `AppModule` real y reemplaza solo el `DataSource`: cada request pasa
 * por los guards, pipes, services y DTOs de producción. Las rutas y los bodies
 * son los que envían los stores de `grupo1/frontend` (commit `3dfdb1f`), y las
 * respuestas se comparan contra una copia de `frontend/types/api.ts`.
 *
 * No prueba SQL, agregaciones, bloqueos ni rollback: ver
 * `docs/workflows/smoke-manual.md`.
 */
describe('Compatibilidad con el frontend (e2e)', () => {
  let app: INestApplication<Server>;
  let server: Server;
  let db: InMemoryDataSource;
  let passwordHash: string;

  async function login(email: string): Promise<string> {
    const response = await request(server)
      .post(`${API}/auth/login`)
      .send({ email, password: PASSWORD_SEED })
      .expect(200);
    return (response.body as { access_token: string }).access_token;
  }

  /** Cliente HTTP autenticado, equivalente a `api` de `frontend/lib/api.ts`. */
  async function clientFor(email: string) {
    const authorization = `Bearer ${await login(email)}`;
    return {
      get: (path: string) =>
        request(server)
          .get(`${API}${path}`)
          .set('Authorization', authorization),
      post: (path: string, body?: object) =>
        request(server)
          .post(`${API}${path}`)
          .set('Authorization', authorization)
          .send(body),
      patch: (path: string, body: object) =>
        request(server)
          .patch(`${API}${path}`)
          .set('Authorization', authorization)
          .send(body),
      delete: (path: string) =>
        request(server)
          .delete(`${API}${path}`)
          .set('Authorization', authorization),
    };
  }

  function productoPorId(id: number): Producto {
    const producto = db.rows(Producto).find((row) => row.id === id);
    if (producto === undefined) throw new Error(`Producto ${id} no sembrado`);
    return producto;
  }

  function mesaPorId(id: number): Mesa {
    const mesa = db.rows(Mesa).find((row) => row.id === id);
    if (mesa === undefined) throw new Error(`Mesa ${id} no sembrada`);
    return mesa;
  }

  beforeAll(async () => {
    passwordHash = await bcrypt.hash(PASSWORD_SEED, 4);
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

  beforeEach(() => {
    seedCafecito(db, passwordHash);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('authStore', () => {
    it('login devuelve token y usuario, sin exponer el hash', async () => {
      const response = await request(server)
        .post(`${API}/auth/login`)
        .send({ email: ADMIN, password: PASSWORD_SEED })
        .expect(200);

      expectFrontendShape(response.body, TOKEN_RESPONSE);
    });

    it('el JWT trae los claims que leen proxy.ts y lib/jwt.ts', async () => {
      const [, payload = ''] = (await login(ADMIN)).split('.');

      expect(
        JSON.parse(Buffer.from(payload, 'base64url').toString()),
      ).toMatchObject({
        sub: '1',
        rol: 'admin',
        exp: expect.any(Number) as number,
      });
    });

    it('GET y PATCH /auth/me devuelven el usuario', async () => {
      const api = await clientFor(MOZO);

      const me = await api.get('/auth/me').expect(200);
      expectFrontendShape(me.body, USUARIO);

      const updated = await api
        .patch('/auth/me', { nombre: 'Mozo Nuevo' })
        .expect(200);
      expectFrontendShape(updated.body, USUARIO);
      expect(updated.body).toMatchObject({ nombre: 'Mozo Nuevo' });
    });

    it('change-password devuelve un mensaje y la clave nueva funciona', async () => {
      const api = await clientFor(MOZO);

      const response = await api
        .post('/auth/change-password', {
          password_actual: PASSWORD_SEED,
          password_nueva: 'clave-nueva',
        })
        .expect(200);
      expectFrontendShape(response.body, MESSAGE_RESPONSE);

      await request(server)
        .post(`${API}/auth/login`)
        .send({ email: MOZO, password: 'clave-nueva' })
        .expect(200);
    });

    it('forgot-password devuelve mensaje y reset_token', async () => {
      const response = await request(server)
        .post(`${API}/auth/forgot-password`)
        .send({ email: MOZO })
        .expect(200);

      expectFrontendShape(response.body, FORGOT_PASSWORD_RESPONSE);
    });

    it('reset-password devuelve un mensaje', async () => {
      const token = await app
        .get(JwtService, { strict: false })
        .signAsync({ sub: '2', purpose: 'password_reset' });

      const response = await request(server)
        .post(`${API}/auth/reset-password`)
        .send({ token, password_nueva: 'clave-nueva' })
        .expect(200);

      expectFrontendShape(response.body, MESSAGE_RESPONSE);
    });
  });

  describe('empleadoStore', () => {
    it('lista, crea sin rol y edita empleados', async () => {
      const api = await clientFor(ADMIN);

      const lista = await api.get('/empleados/').expect(200);
      expectFrontendShape(lista.body, arrayOf(USUARIO));

      const nuevo = await api
        .post('/empleados/', {
          nombre: 'Nueva Moza',
          email: 'nueva@cafecito.com',
          password: 'clave-segura',
        })
        .expect(201);
      expectFrontendShape(nuevo.body, USUARIO);
      expect(nuevo.body).toMatchObject({ rol: 'mozo', activo: true });

      const editado = await api
        .patch('/empleados/2', { activo: false })
        .expect(200);
      expectFrontendShape(editado.body, USUARIO);
      expect(editado.body).toMatchObject({ activo: false });
    });
  });

  describe('mesaStore', () => {
    it('lista las 12 mesas en orden, crea y cambia de estado', async () => {
      const api = await clientFor(ADMIN);

      const lista = await api.get('/mesas/').expect(200);
      expectFrontendShape(lista.body, arrayOf(MESA));
      expect(
        (lista.body as { numero: number }[]).map((mesa) => mesa.numero),
      ).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);

      const nueva = await api.post('/mesas/', { numero: 13 }).expect(201);
      expectFrontendShape(nueva.body, MESA);

      const reservada = await api
        .patch('/mesas/1', { estado: 'reservada' })
        .expect(200);
      expectFrontendShape(reservada.body, MESA);
      expect(reservada.body).toMatchObject({ estado: 'reservada' });
    });
  });

  describe('productoStore', () => {
    it('lista productos y categorías con importes numéricos', async () => {
      const api = await clientFor(ADMIN);

      const productos = await api.get('/productos/').expect(200);
      expectFrontendShape(productos.body, arrayOf(PRODUCTO));
      expect(productos.body).toHaveLength(10);

      const categorias = await api.get('/categorias/').expect(200);
      expectFrontendShape(categorias.body, arrayOf(CATEGORIA));
      expect(categorias.body).toHaveLength(4);
    });

    it('crea y edita con centavos, sin perder decimales', async () => {
      const api = await clientFor(ADMIN);

      const creado = await api
        .post('/productos/', {
          nombre: 'Tostado mixto',
          descripcion: null,
          precio: 2200.75,
          stock: 30,
          stock_minimo: 5,
          disponible: true,
          categoria_id: 2,
        })
        .expect(201);
      expectFrontendShape(creado.body, PRODUCTO);
      expect(creado.body).toMatchObject({
        precio: 2200.75,
        categoria: { id: 2, nombre: 'Comida' },
      });

      const editado = await api
        .patch('/productos/1', { precio: 900.5 })
        .expect(200);
      expectFrontendShape(editado.body, PRODUCTO);
      expect(editado.body).toMatchObject({ precio: 900.5 });
    });

    it('elimina un producto sin ventas con 204 y sin body', async () => {
      const api = await clientFor(ADMIN);

      const response = await api.delete('/productos/10').expect(204);

      expect(response.text).toBe('');
      expect(db.rows(Producto).map((row) => row.id)).not.toContain(10);
    });

    it('conserva un producto con historial y responde el 400 del contrato', async () => {
      const api = await clientFor(ADMIN);
      db.seed(DetallePedido, [
        { id: 1, pedidoId: 1, productoId: 10, cantidad: 1, subtotal: 500 },
      ]);

      const response = await api.delete('/productos/10').expect(400);

      expect(response.body).toEqual({
        detail:
          'No se puede eliminar: el producto tiene pedidos asociados. Marcalo como no disponible en su lugar.',
      });
      expect(db.rows(Producto).map((row) => row.id)).toContain(10);
    });
  });

  describe('carritoStore y pedidoStore', () => {
    const NUEVO_PEDIDO = {
      mesa_id: 1,
      detalles: [
        { producto_id: 1, cantidad: 2 },
        { producto_id: 5, cantidad: 1 },
      ],
    };

    it('un mozo confirma el carrito y ve el pedido activo', async () => {
      const api = await clientFor(MOZO);

      const productos = await api.get('/productos/').expect(200);
      expectFrontendShape(productos.body, arrayOf(PRODUCTO));

      const creado = await api.post('/pedidos/', NUEVO_PEDIDO).expect(201);
      expectFrontendShape(creado.body, PEDIDO);

      const activos = await api.get('/pedidos/').expect(200);
      expectFrontendShape(activos.body, arrayOf(PEDIDO));
      expect(activos.body).toHaveLength(1);
    });

    it('cambia de estado y cobra con la forma que espera el frontend', async () => {
      const api = await clientFor(ADMIN);
      const creado = await api.post('/pedidos/', NUEVO_PEDIDO).expect(201);
      const { id } = creado.body as PedidoBody;
      await api.post('/caja/apertura', { monto_inicial: 1000 }).expect(201);

      for (const estado of ['en_preparacion', 'listo', 'entregado']) {
        const cambio = await api
          .patch(`/pedidos/${id}`, { estado })
          .expect(200);
        expectFrontendShape(cambio.body, PEDIDO);
      }

      const cobrado = await api
        .post(`/pedidos/${id}/pago`, { metodo_pago: 'mercado_pago' })
        .expect(200);
      expectFrontendShape(cobrado.body, PEDIDO);
    });
  });

  describe('cajaStore', () => {
    it('responde el literal null si no hay caja abierta', async () => {
      const api = await clientFor(ADMIN);

      const response = await api.get('/caja/').expect(200);

      expect(response.text).toBe('null');
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('abre, consulta, lista movimientos e historial, y cierra', async () => {
      const api = await clientFor(ADMIN);

      const apertura = await api
        .post('/caja/apertura', { monto_inicial: 1000.5 })
        .expect(201);
      expectFrontendShape(apertura.body, CAJA);
      expect(apertura.body).toMatchObject({
        estado: 'abierta',
        monto_inicial: 1000.5,
        fecha_cierre: null,
        monto_final: null,
        total_ventas: 0,
      });

      const actual = await api.get('/caja/').expect(200);
      expectFrontendShape(actual.body, CAJA);

      const { id } = apertura.body as { id: number };
      const movimientos = await api.get(`/caja/${id}/movimientos`).expect(200);
      expect(movimientos.body).toEqual([]);

      const cierre = await api
        .post('/caja/cierre', { monto_final: 1000.5 })
        .expect(200);
      expectFrontendShape(cierre.body, CAJA);
      expect(cierre.body).toMatchObject({ estado: 'cerrada' });

      const historial = await api.get('/caja/historial').expect(200);
      expectFrontendShape(historial.body, arrayOf(CAJA));
    });
  });

  describe('dashboardStore y reportesStore', () => {
    it('devuelven los ceros y listas vacías con la forma del frontend', async () => {
      const api = await clientFor(ADMIN);

      const dashboard = await api.get('/dashboard/resumen').expect(200);
      expectFrontendShape(dashboard.body, DASHBOARD_RESUMEN);

      const reporte = await api
        .get('/reportes/ventas?desde=2026-11-01&hasta=2026-11-30')
        .expect(200);
      expectFrontendShape(reporte.body, REPORTE_VENTAS);
    });
  });

  describe('errores que clasifica normalizeApiError', () => {
    it('401 sin token y con credenciales incorrectas', async () => {
      const sinToken = await request(server).get(`${API}/mesas/`).expect(401);
      expectFrontendShape(sinToken.body, API_ERROR);
      expect(sinToken.body).toEqual({ detail: 'Token inválido o expirado' });

      const credenciales = await request(server)
        .post(`${API}/auth/login`)
        .send({ email: ADMIN, password: 'incorrecta' })
        .expect(401);
      expectFrontendShape(credenciales.body, API_ERROR);
    });

    it.each([
      ['caja', '/caja/'],
      ['dashboard', '/dashboard/resumen'],
      ['reportes', '/reportes/ventas?desde=2026-11-01&hasta=2026-11-30'],
      ['empleados', '/empleados/'],
    ])('403 para un mozo en %s', async (_modulo, path) => {
      const api = await clientFor(MOZO);

      const response = await api.get(path).expect(403);

      expect(response.body).toEqual({
        detail: 'Se requiere rol de administrador',
      });
    });

    it.each([
      ['mesa', '/mesas/999', 'Mesa no encontrada', { estado: 'libre' }],
      ['producto', '/productos/999', 'Producto no encontrado', { stock: 1 }],
      ['pedido', '/pedidos/999', 'Pedido no encontrado', { estado: 'listo' }],
    ])(
      '404 con mensaje en español para %s',
      async (_recurso, path, detail, body) => {
        const api = await clientFor(ADMIN);

        const response = await api.patch(path, body).expect(404);

        expect(response.body).toEqual({ detail });
      },
    );

    it('422 con un solo mensaje string, no la lista de FastAPI', async () => {
      const api = await clientFor(ADMIN);

      const response = await api
        .post('/productos/', { nombre: 'Café', precio: 0, categoria_id: 1 })
        .expect(422);

      expectFrontendShape(response.body, API_ERROR);
    });

    it('400 de negocio con el mensaje en español', async () => {
      const api = await clientFor(MOZO);

      const response = await api
        .post('/pedidos/', {
          mesa_id: 999,
          detalles: [{ producto_id: 1, cantidad: 1 }],
        })
        .expect(400);

      expect(response.body).toEqual({ detail: 'Mesa 999 no encontrada' });
    });

    it('404 en JSON para una ruta inexistente', async () => {
      const api = await clientFor(ADMIN);

      const response = await api.get('/no-existe').expect(404);

      expectFrontendShape(response.body, API_ERROR);
    });
  });

  describe('barra final', () => {
    it.each([
      '/mesas',
      '/productos',
      '/categorias',
      '/pedidos',
      '/empleados',
      '/caja',
    ])('%s responde igual con y sin barra, sin redirect', async (path) => {
      const api = await clientFor(ADMIN);

      const sinBarra = await api.get(path).expect(200);
      const conBarra = await api.get(`${path}/`).expect(200);

      expect(conBarra.text).toBe(sinBarra.text);
      expect(conBarra.headers.location).toBeUndefined();
    });
  });

  describe('flujo completo del ticket', () => {
    it('recorre login → pedido → estados → caja → cobro → cierre → KPIs', async () => {
      // 1. Login como admin y GET /auth/me con el JWT.
      const api = await clientFor(ADMIN);
      await api.get('/auth/me').expect(200);

      // 2. Las 12 mesas del seed.
      const mesas = await api.get('/mesas/').expect(200);
      expect(mesas.body).toHaveLength(12);

      // 3. Pedido en mesa 1 con 2 productos: mesa ocupada y stock descontado.
      const stockCafe = productoPorId(1).stock;
      const stockMedialuna = productoPorId(5).stock;
      const creado = await api
        .post('/pedidos/', {
          mesa_id: 1,
          detalles: [
            { producto_id: 1, cantidad: 2 },
            { producto_id: 5, cantidad: 1 },
          ],
        })
        .expect(201);
      const pedido = creado.body as PedidoBody;
      expect(pedido).toMatchObject({ estado: 'pendiente', total: 2150 });
      expect(mesaPorId(1).estado).toBe('ocupada');
      expect(productoPorId(1).stock).toBe(stockCafe - 2);
      expect(productoPorId(5).stock).toBe(stockMedialuna - 1);

      // 4. pendiente → en_preparacion → listo → entregado: mesa a pendiente_cobro.
      for (const estado of ['en_preparacion', 'listo']) {
        await api.patch(`/pedidos/${pedido.id}`, { estado }).expect(200);
        expect(mesaPorId(1).estado).toBe('ocupada');
      }
      await api
        .patch(`/pedidos/${pedido.id}`, { estado: 'entregado' })
        .expect(200);
      expect(mesaPorId(1).estado).toBe('pendiente_cobro');

      // 5. Abrir caja y cobrar: pago creado, pedido pagado, mesa libre.
      const caja = await api
        .post('/caja/apertura', { monto_inicial: 1000 })
        .expect(201);
      const { id: cajaId } = caja.body as { id: number };
      const cobrado = await api
        .post(`/pedidos/${pedido.id}/pago`, { metodo_pago: 'efectivo' })
        .expect(200);
      expect(cobrado.body).toMatchObject({
        estado: 'pagado',
        mesa: { estado: 'libre' },
      });
      expect(mesaPorId(1).estado).toBe('libre');
      expect(db.rows(Pago)).toEqual([
        expect.objectContaining({
          pedidoId: pedido.id,
          cajaId,
          monto: 2150,
          metodoPago: 'efectivo',
        }),
      ]);

      // Un pedido pagado ya no es activo.
      const activos = await api.get('/pedidos/').expect(200);
      expect(activos.body).toEqual([]);

      // 6. Movimientos de caja y cierre.
      const movimientos = await api
        .get(`/caja/${cajaId}/movimientos`)
        .expect(200);
      expectFrontendShape(movimientos.body, arrayOf(MOVIMIENTO_CAJA));
      expect(movimientos.body).toEqual([
        expect.objectContaining({
          pedido_id: pedido.id,
          mesa_numero: 1,
          monto: 2150,
          metodo_pago: 'efectivo',
        }),
      ]);
      const cierre = await api
        .post('/caja/cierre', { monto_final: 3150 })
        .expect(200);
      expect(cierre.body).toMatchObject({
        estado: 'cerrada',
        monto_final: 3150,
        total_ventas: 2150,
      });
      expect(db.rows(Caja)[0]).toMatchObject({ estado: 'cerrada' });

      // 7. Dashboard y reportes: con datos, el shape sigue siendo el del frontend.
      const dashboard = await api.get('/dashboard/resumen').expect(200);
      expectFrontendShape(dashboard.body, DASHBOARD_RESUMEN);
      expect(dashboard.body).toMatchObject({
        ventas_dia: { total: 2150, pagos: 1 },
      });

      const reporte = await api
        .get('/reportes/ventas?desde=2026-11-01&hasta=2026-11-30')
        .expect(200);
      expectFrontendShape(reporte.body, REPORTE_VENTAS);
      expect(reporte.body).toMatchObject({
        resumen: {
          total_vendido: 2150,
          cantidad_cobros: 1,
          ticket_promedio: 2150,
        },
        cajas: [{ diferencia: 0 }],
      });
    });

    it('cancelar un pedido repone el stock y libera la mesa', async () => {
      const api = await clientFor(MOZO);
      const stock = productoPorId(1).stock;
      const creado = await api
        .post('/pedidos/', {
          mesa_id: 2,
          detalles: [{ producto_id: 1, cantidad: 3 }],
        })
        .expect(201);

      await api
        .patch(`/pedidos/${(creado.body as PedidoBody).id}`, {
          estado: 'cancelado',
        })
        .expect(200);

      expect(productoPorId(1).stock).toBe(stock);
      expect(mesaPorId(2).estado).toBe('libre');
    });

    it('no permite cobrar sin caja abierta', async () => {
      const api = await clientFor(ADMIN);
      const creado = await api
        .post('/pedidos/', {
          mesa_id: 3,
          detalles: [{ producto_id: 2, cantidad: 1 }],
        })
        .expect(201);
      const { id } = creado.body as PedidoBody;
      for (const estado of ['en_preparacion', 'listo', 'entregado']) {
        await api.patch(`/pedidos/${id}`, { estado }).expect(200);
      }

      const response = await api
        .post(`/pedidos/${id}/pago`, { metodo_pago: 'efectivo' })
        .expect(400);

      expect(response.body).toEqual({
        detail: 'No se puede cobrar un pedido sin una caja abierta',
      });
      expect(db.rows(Pago)).toEqual([]);
      expect(mesaPorId(3).estado).toBe('pendiente_cobro');
    });
  });
});
