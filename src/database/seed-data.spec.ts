import { ROLES } from '../users/rol.js';
import {
  SEED_CATEGORIAS,
  SEED_MESAS,
  SEED_PRODUCTOS,
  SEED_USUARIOS,
} from './seed-data.js';

describe('datos del seed', () => {
  it('replica los conteos de seed.py', () => {
    expect(SEED_USUARIOS).toHaveLength(2);
    expect(SEED_CATEGORIAS).toHaveLength(4);
    expect(SEED_PRODUCTOS).toHaveLength(10);
    expect(SEED_MESAS).toHaveLength(12);
  });

  it('define los usuarios de desarrollo con roles válidos y sin duplicados', () => {
    const emails = SEED_USUARIOS.map((usuario) => usuario.email);

    expect(new Set(emails).size).toBe(emails.length);
    expect(SEED_USUARIOS.map((usuario) => usuario.rol)).toEqual([
      'admin',
      'mozo',
    ]);
    expect(SEED_USUARIOS.every((usuario) => usuario.activo)).toBe(true);
    expect(SEED_USUARIOS.every((usuario) => ROLES.includes(usuario.rol))).toBe(
      true,
    );
  });

  it('asocia cada producto a una categoría existente y usa numeric(10,2)', () => {
    const nombres = SEED_PRODUCTOS.map((producto) => producto.nombre);

    expect(new Set(nombres).size).toBe(nombres.length);
    expect(
      SEED_PRODUCTOS.every((producto) =>
        SEED_CATEGORIAS.includes(producto.categoria),
      ),
    ).toBe(true);
    expect(
      SEED_PRODUCTOS.every((producto) => /^\d+\.\d{2}$/.test(producto.precio)),
    ).toBe(true);
  });

  it('numera las mesas del 1 al 12 y las deja libres', () => {
    expect(SEED_MESAS.map((mesa) => mesa.numero)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
    ]);
    expect(SEED_MESAS.every((mesa) => mesa.estado === 'libre')).toBe(true);
  });
});
