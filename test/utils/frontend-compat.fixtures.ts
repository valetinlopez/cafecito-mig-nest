import { Caja } from '../../src/caja/entities/caja.entity.js';
import { Categoria } from '../../src/categorias/entities/categoria.entity.js';
import { Mesa } from '../../src/mesas/entities/mesa.entity.js';
import { Pago } from '../../src/pagos/entities/pago.entity.js';
import { DetallePedido } from '../../src/pedidos/entities/detalle-pedido.entity.js';
import { Pedido } from '../../src/pedidos/entities/pedido.entity.js';
import { ACTIVE_PEDIDO_ESTADOS } from '../../src/pedidos/pedido-estado.js';
import type { PedidoEstado } from '../../src/pedidos/pedido-estado.js';
import { Producto } from '../../src/productos/entities/producto.entity.js';
import { Usuario } from '../../src/users/entities/usuario.entity.js';
import {
  createInMemoryDataSource,
  type InMemoryDataSource,
  type RawQueryResolver,
} from './in-memory-data-source.js';

export const PASSWORD_SEED = '123456';

/** Importe como lo entrega `pg` para una columna `numeric`. */
function money(value: number): string {
  return value.toFixed(2);
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function countBy<T>(rows: T[], predicate: (row: T) => boolean): string {
  return String(rows.filter(predicate).length);
}

function esActivo(pedido: Pedido): boolean {
  return (ACTIVE_PEDIDO_ESTADOS as readonly PedidoEstado[]).includes(
    pedido.estado,
  );
}

/** Misma regla que `PAGO_EN_PERIODO_DE_CAJA`, sobre las filas en memoria. */
function pagosDeCaja(
  db: InMemoryDataSource,
  cajaId: unknown,
  ahora: unknown,
): Pago[] {
  const caja = db.rows(Caja).find(({ id }) => id === cajaId);
  if (caja === undefined) return [];
  const fin = caja.fechaCierre ?? (ahora as Date);
  return db
    .rows(Pago)
    .filter((pago) => pago.fecha >= caja.fechaApertura && pago.fecha <= fin);
}

/**
 * Reemplazo escrito a mano de cada `createQueryBuilder` de la aplicación.
 *
 * Calcula un resultado razonable sobre las filas en memoria y lo devuelve como
 * strings, igual que el driver, para ejercitar la conversión de los services.
 * **No prueba el SQL real** ni los filtros de fecha: eso queda para la guía
 * manual (`docs/workflows/smoke-manual.md`).
 */
const RAW_QUERIES: Record<string, RawQueryResolver> = {
  'pago:total_ventas': ({ cajaId, ahora }, db) => [
    {
      total_ventas: money(
        sum(pagosDeCaja(db, cajaId, ahora).map((pago) => pago.monto)),
      ),
    },
  ],
  'pago:caja_id': ({ cajaIds, ahora }, db) =>
    (cajaIds as number[]).map((cajaId) => ({
      caja_id: String(cajaId),
      total_ventas: money(
        sum(pagosDeCaja(db, cajaId, ahora).map((pago) => pago.monto)),
      ),
    })),
  'pago:id': ({ cajaId, ahora }, db) =>
    pagosDeCaja(db, cajaId, ahora)
      .map((pago) => {
        const pedido = db.rows(Pedido).find(({ id }) => id === pago.pedidoId);
        const mesa = db.rows(Mesa).find(({ id }) => id === pedido?.mesaId);
        const usuario = db
          .rows(Usuario)
          .find(({ id }) => id === pedido?.usuarioId);
        return {
          id: pago.id,
          fecha: pago.fecha,
          pedido_id: pago.pedidoId,
          mesa_numero: mesa?.numero,
          monto: money(pago.monto),
          metodo_pago: pago.metodoPago,
          usuario_nombre: usuario?.nombre ?? null,
        };
      }),
  'pago:total': (_params, db) => [
    {
      total: money(sum(db.rows(Pago).map((pago) => pago.monto))),
      pagos: String(db.rows(Pago).length),
    },
  ],
  'mesa:total': (_params, db) => {
    const mesas = db.rows(Mesa);
    return [
      {
        total: String(mesas.length),
        libres: countBy(mesas, (mesa) => mesa.estado === 'libre'),
        ocupadas: countBy(mesas, (mesa) => mesa.estado === 'ocupada'),
        pendientes_cobro: countBy(
          mesas,
          (mesa) => mesa.estado === 'pendiente_cobro',
        ),
      },
    ];
  },
  'pedido:total': (_params, db) => {
    const activos = db.rows(Pedido).filter(esActivo);
    return [
      {
        total: String(activos.length),
        pendientes: countBy(activos, (p) => p.estado === 'pendiente'),
        en_preparacion: countBy(activos, (p) => p.estado === 'en_preparacion'),
        listos: countBy(activos, (p) => p.estado === 'listo'),
        entregados: countBy(activos, (p) => p.estado === 'entregado'),
      },
    ];
  },
  'pedido:id': (_params, db) =>
    db.rows(Pedido).map((pedido) => ({
      id: pedido.id,
      mesa: db.rows(Mesa).find(({ id }) => id === pedido.mesaId)?.numero,
      items: String(
        sum(
          db
            .rows(DetallePedido)
            .filter((detalle) => detalle.pedidoId === pedido.id)
            .map((detalle) => detalle.cantidad),
        ),
      ),
      total: money(pedido.total),
      estado: pedido.estado,
    })),
  'pago:total_vendido': (_params, db) => {
    const pagos = db.rows(Pago);
    return [
      {
        total_vendido: money(sum(pagos.map((pago) => pago.monto))),
        cantidad_cobros: String(pagos.length),
        pedidos_cobrados: String(new Set(pagos.map((p) => p.pedidoId)).size),
      },
    ];
  },
  'pago:metodo_pago': (_params, db) =>
    db.rows(Pago).map((pago) => ({
      metodo_pago: pago.metodoPago,
      cantidad: '1',
      total: money(pago.monto),
    })),
  'detalle:producto_id': (_params, db) =>
    db.rows(DetallePedido).map((detalle) => ({
      producto_id: String(detalle.productoId),
      nombre: db.rows(Producto).find(({ id }) => id === detalle.productoId)
        ?.nombre,
      cantidad: String(detalle.cantidad),
      total: money(detalle.subtotal),
    })),
  'pedido:mesa_id': (_params, db) =>
    db
      .rows(Pedido)
      .filter((pedido) => pedido.estado === 'pagado')
      .map((pedido) => ({
        mesa_id: String(pedido.mesaId),
        numero: String(
          db.rows(Mesa).find(({ id }) => id === pedido.mesaId)?.numero,
        ),
        cantidad_pedidos: '1',
        total: money(pedido.total),
      })),
  'caja:caja_id': ({ ahora }, db) =>
    db.rows(Caja).map((caja) => ({
      caja_id: String(caja.id),
      estado: caja.estado,
      fecha_apertura: caja.fechaApertura,
      fecha_cierre: caja.fechaCierre,
      monto_inicial: money(caja.montoInicial),
      monto_final: caja.montoFinal === null ? null : money(caja.montoFinal),
      ventas_efectivo: money(
        sum(
          pagosDeCaja(db, caja.id, ahora)
            .filter((pago) => pago.metodoPago === 'efectivo')
            .map((pago) => pago.monto),
        ),
      ),
    })),
};

export function createCafecitoDataSource(): InMemoryDataSource {
  return createInMemoryDataSource({
    entities: {
      [Pedido.name]: {
        relations: {
          mesa: { kind: 'one', target: Mesa, foreignKey: 'mesaId' },
          usuario: { kind: 'one', target: Usuario, foreignKey: 'usuarioId' },
          detalles: {
            kind: 'many',
            target: DetallePedido,
            foreignKey: 'pedidoId',
          },
        },
      },
      // La base real no asigna defaults: solo quedan en NULL las columnas que
      // la aplicación no completa al insertar (ADR 0009).
      [Caja.name]: {
        defaults: () => ({
          fechaCierre: null,
          montoFinal: null,
        }),
      },
    },
    rawQueries: RAW_QUERIES,
  });
}

/** Mismos datos que `grupo1/backend/seed.py`, con `precio` como lo lee `pg`. */
export function seedCafecito(
  db: InMemoryDataSource,
  passwordHash: string,
): void {
  db.reset();
  db.seed(Usuario, [
    {
      id: 1,
      nombre: 'Administrador',
      email: 'admin@cafecito.com',
      passwordHash,
      rol: 'admin',
      activo: true,
    },
    {
      id: 2,
      nombre: 'Mozo',
      email: 'mozo@cafecito.com',
      passwordHash,
      rol: 'mozo',
      activo: true,
    },
  ]);
  db.seed(Categoria, [
    { id: 1, nombre: 'Bebidas' },
    { id: 2, nombre: 'Comida' },
    { id: 3, nombre: 'Postres' },
    { id: 4, nombre: 'Extras' },
  ]);
  db.seed(
    Producto,
    (
      [
        ['Café con leche', '850.00', 100, 1],
        ['Café negro', '600.00', 100, 1],
        ['Cappuccino', '950.00', 80, 1],
        ['Jugo de naranja', '700.00', 50, 1],
        ['Medialuna', '450.00', 60, 2],
        ['Sándwich de miga', '1200.00', 40, 2],
        ['Empanada', '650.00', 50, 2],
        ['Chocotorta', '1500.00', 20, 3],
        ['Alfajor', '400.00', 80, 3],
        ['Agua mineral', '500.00', 100, 4],
      ] as const
    ).map(([nombre, precio, stock, categoriaId], index) => ({
      id: index + 1,
      nombre,
      descripcion: null,
      precio,
      stock,
      stockMinimo: 5,
      disponible: true,
      categoriaId,
    })),
  );
  db.seed(
    Mesa,
    Array.from({ length: 12 }, (_, index) => ({
      id: index + 1,
      numero: index + 1,
      estado: 'libre' as const,
    })),
  );
}
