import { Logger } from '@nestjs/common';
import bcrypt from 'bcrypt';
import type { EntityManager, ObjectLiteral, Repository } from 'typeorm';
import { Categoria } from '../categorias/entities/categoria.entity.js';
import { BCRYPT_ROUNDS } from '../common/auth/bcrypt.js';
import { Mesa } from '../mesas/entities/mesa.entity.js';
import { Producto } from '../productos/entities/producto.entity.js';
import { Usuario } from '../users/entities/usuario.entity.js';
import {
  SEED_CATEGORIAS,
  SEED_MESAS,
  SEED_PASSWORD,
  SEED_PRODUCTOS,
  SEED_USUARIOS,
} from './seed-data.js';

export type SeedTabla = 'usuarios' | 'categorias' | 'productos' | 'mesas';

export interface SeedReport {
  usuarios: number;
  categorias: number;
  productos: number;
  mesas: number;
  /** Tablas que ya tenían filas y por eso no se tocaron. */
  omitidas: SeedTabla[];
}

/** Contrato mínimo del logger; permite silenciarlo en los tests. */
export interface SeedLogger {
  log(message: string): void;
  warn(message: string): void;
}

const DEFAULT_LOGGER: SeedLogger = new Logger('Seed');

async function isEmpty<T extends ObjectLiteral>(
  repository: Repository<T>,
  tabla: SeedTabla,
  report: SeedReport,
  logger: SeedLogger,
): Promise<boolean> {
  const total = await repository.count();

  if (total === 0) {
    return true;
  }

  report.omitidas.push(tabla);
  logger.warn(`${tabla}: ya tiene ${total} fila(s); no se inserta nada.`);
  return false;
}

/**
 * Carga los datos base del legacy dentro de una transacción.
 *
 * La idempotencia es **por tabla**, igual que `seed.py`: si una tabla ya tiene
 * filas se omite completa y se continúa con las demás. No actualiza ni borra
 * datos existentes (la base es compartida con producción).
 *
 * Los productos resuelven su categoría por nombre, nunca por id fijo, porque
 * una base de desarrollo puede tener ids distintos a los del legacy.
 */
export async function runSeed(
  manager: EntityManager,
  logger: SeedLogger = DEFAULT_LOGGER,
): Promise<SeedReport> {
  const report: SeedReport = {
    usuarios: 0,
    categorias: 0,
    productos: 0,
    mesas: 0,
    omitidas: [],
  };

  const categorias = manager.getRepository(Categoria);
  if (await isEmpty(categorias, 'categorias', report, logger)) {
    await categorias.insert(SEED_CATEGORIAS.map((nombre) => ({ nombre })));
    report.categorias = SEED_CATEGORIAS.length;
    logger.log(`categorias: ${SEED_CATEGORIAS.length} filas insertadas.`);
  }

  const productos = manager.getRepository(Producto);
  if (await isEmpty(productos, 'productos', report, logger)) {
    const idsPorNombre = new Map(
      (await categorias.find()).map((categoria) => [
        categoria.nombre,
        categoria.id,
      ]),
    );

    const filas = SEED_PRODUCTOS.map((producto) => {
      const categoriaId = idsPorNombre.get(producto.categoria);

      if (categoriaId === undefined) {
        throw new Error(
          `Falta la categoría "${producto.categoria}" para el producto "${producto.nombre}": el seed no inserta productos sin su categoría.`,
        );
      }

      return {
        nombre: producto.nombre,
        descripcion: producto.descripcion,
        precio: producto.precio,
        stock: producto.stock,
        stockMinimo: producto.stockMinimo,
        disponible: producto.disponible,
        categoriaId,
      };
    });

    await productos.insert(filas);
    report.productos = filas.length;
    logger.log(`productos: ${filas.length} filas insertadas.`);
  }

  const usuarios = manager.getRepository(Usuario);
  if (await isEmpty(usuarios, 'usuarios', report, logger)) {
    const filas = await Promise.all(
      SEED_USUARIOS.map(async (usuario) => ({
        nombre: usuario.nombre,
        email: usuario.email,
        passwordHash: await bcrypt.hash(SEED_PASSWORD, BCRYPT_ROUNDS),
        rol: usuario.rol,
        activo: usuario.activo,
      })),
    );

    await usuarios.insert(filas);
    report.usuarios = filas.length;
    logger.log(`usuarios: ${filas.length} filas insertadas.`);
  }

  const mesas = manager.getRepository(Mesa);
  if (await isEmpty(mesas, 'mesas', report, logger)) {
    await mesas.insert(SEED_MESAS.map((mesa) => ({ ...mesa })));
    report.mesas = SEED_MESAS.length;
    logger.log(`mesas: ${SEED_MESAS.length} filas insertadas.`);
  }

  return report;
}
