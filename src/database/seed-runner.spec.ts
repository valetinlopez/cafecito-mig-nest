import bcrypt from 'bcrypt';
import { Categoria } from '../categorias/entities/categoria.entity.js';
import { Mesa } from '../mesas/entities/mesa.entity.js';
import { Producto } from '../productos/entities/producto.entity.js';
import { Usuario } from '../users/entities/usuario.entity.js';
import { createInMemoryDataSource } from '../../test/utils/in-memory-data-source.js';
import type { InMemoryDataSource } from '../../test/utils/in-memory-data-source.js';
import {
  SEED_CATEGORIAS,
  SEED_MESAS,
  SEED_PASSWORD,
  SEED_PRODUCTOS,
  SEED_USUARIOS,
} from './seed-data.js';
import { runSeed } from './seed-runner.js';
import type { SeedLogger } from './seed-runner.js';

function createSilentLogger(): SeedLogger {
  return { log: vi.fn(), warn: vi.fn() };
}

describe('runSeed', () => {
  let db: InMemoryDataSource;
  let logger: SeedLogger;

  beforeEach(() => {
    db = createInMemoryDataSource();
    logger = createSilentLogger();
  });

  it('inserta los datos del legacy en una base vacía', async () => {
    const report = await runSeed(db.manager, logger);

    expect(report).toEqual({
      usuarios: 2,
      categorias: 4,
      productos: 10,
      mesas: 12,
      omitidas: [],
    });

    const usuarios = db.rows(Usuario);
    expect(usuarios.map((usuario) => usuario.email)).toEqual(
      SEED_USUARIOS.map((usuario) => usuario.email),
    );
    expect(usuarios.every((usuario) => usuario.activo)).toBe(true);
    const passwordsOk = await Promise.all(
      usuarios.map((usuario) =>
        bcrypt.compare(SEED_PASSWORD, usuario.passwordHash),
      ),
    );
    expect(passwordsOk).toEqual([true, true]);
    expect(new Set(usuarios.map((usuario) => usuario.passwordHash)).size).toBe(
      2,
    );

    const categorias = db.rows(Categoria);
    expect(categorias.map((categoria) => categoria.nombre)).toEqual([
      ...SEED_CATEGORIAS,
    ]);

    const categoriasPorId = new Map(
      categorias.map((categoria) => [categoria.id, categoria.nombre]),
    );
    const productos = db.rows(Producto);
    expect(productos).toHaveLength(SEED_PRODUCTOS.length);

    for (const esperado of SEED_PRODUCTOS) {
      const insertado = productos.find(
        (producto) => producto.nombre === esperado.nombre,
      );

      expect(insertado).toMatchObject({
        precio: esperado.precio,
        stock: esperado.stock,
        stockMinimo: esperado.stockMinimo,
        disponible: esperado.disponible,
        descripcion: null,
      });
      expect(categoriasPorId.get(insertado?.categoriaId as number)).toBe(
        esperado.categoria,
      );
    }

    const mesas = db.rows(Mesa);
    expect(mesas.map((mesa) => mesa.numero)).toEqual(
      SEED_MESAS.map((mesa) => mesa.numero),
    );
    expect(mesas.every((mesa) => mesa.estado === 'libre')).toBe(true);
  });

  it('es idempotente: la segunda ejecución no duplica ni actualiza', async () => {
    await runSeed(db.manager, logger);

    const report = await runSeed(db.manager, logger);

    expect(report).toEqual({
      usuarios: 0,
      categorias: 0,
      productos: 0,
      mesas: 0,
      omitidas: ['categorias', 'productos', 'usuarios', 'mesas'],
    });
    expect(db.rows(Usuario)).toHaveLength(2);
    expect(db.rows(Categoria)).toHaveLength(4);
    expect(db.rows(Producto)).toHaveLength(10);
    expect(db.rows(Mesa)).toHaveLength(12);
  });

  it('omite solo la tabla que ya tiene filas', async () => {
    db.seed(Usuario, [
      {
        id: 1,
        nombre: 'Existente',
        email: 'existente@cafecito.com',
        passwordHash: 'hash',
        rol: 'admin',
        activo: true,
      },
    ]);

    const report = await runSeed(db.manager, logger);

    expect(report.usuarios).toBe(0);
    expect(report.omitidas).toEqual(['usuarios']);
    expect(report.categorias).toBe(4);
    expect(report.productos).toBe(10);
    expect(report.mesas).toBe(12);
    expect(db.rows(Usuario)).toHaveLength(1);
  });

  it('resuelve la categoría por nombre y no por id fijo', async () => {
    db.seed(Categoria, [
      { id: 10, nombre: 'Bebidas' },
      { id: 11, nombre: 'Comida' },
      { id: 12, nombre: 'Postres' },
      { id: 13, nombre: 'Extras' },
    ]);

    await runSeed(db.manager, logger);

    const productos = db.rows(Producto);
    const agua = productos.find(
      (producto) => producto.nombre === 'Agua mineral',
    );
    const cafe = productos.find(
      (producto) => producto.nombre === 'Café con leche',
    );

    expect(agua?.categoriaId).toBe(13);
    expect(cafe?.categoriaId).toBe(10);
  });

  it('falla sin insertar productos si falta una categoría', async () => {
    db.seed(Categoria, [
      { id: 1, nombre: 'Bebidas' },
      { id: 2, nombre: 'Comida' },
      { id: 3, nombre: 'Postres' },
    ]);

    await expect(runSeed(db.manager, logger)).rejects.toThrow(
      'Falta la categoría "Extras" para el producto "Agua mineral"',
    );
    expect(db.rows(Producto)).toHaveLength(0);
    expect(db.rows(Usuario)).toHaveLength(0);
  });
});
