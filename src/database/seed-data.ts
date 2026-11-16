import type { MesaEstado } from '../mesas/mesa-estado.js';
import type { Rol } from '../users/rol.js';

/**
 * Datos del seed de desarrollo, idénticos a `grupo1/backend/seed.py`.
 *
 * La fuente de verdad para los tests de compatibilidad es
 * `test/utils/frontend-compat.fixtures.ts` (`seedCafecito`). Si cambia el
 * legacy, se actualizan ambos archivos en el mismo PR.
 */

/** Contraseña de los dos usuarios de desarrollo. No es un secreto. */
export const SEED_PASSWORD = '123456';

export interface SeedUsuario {
  nombre: string;
  email: string;
  rol: Rol;
  activo: true;
}

export const SEED_CATEGORIAS = [
  'Bebidas',
  'Comida',
  'Postres',
  'Extras',
] as const;

export type SeedCategoriaNombre = (typeof SEED_CATEGORIAS)[number];

export interface SeedProducto {
  nombre: string;
  descripcion: null;
  /** `numeric(10,2)`; `pg` lo lee como string. */
  precio: string;
  stock: number;
  stockMinimo: number;
  disponible: true;
  categoria: SeedCategoriaNombre;
}

export interface SeedMesa {
  numero: number;
  estado: MesaEstado;
}

export const SEED_USUARIOS: readonly SeedUsuario[] = [
  {
    nombre: 'Administrador',
    email: 'admin@cafecito.com',
    rol: 'admin',
    activo: true,
  },
  {
    nombre: 'Mozo',
    email: 'mozo@cafecito.com',
    rol: 'mozo',
    activo: true,
  },
];

export const SEED_PRODUCTOS: readonly SeedProducto[] = [
  {
    nombre: 'Café con leche',
    descripcion: null,
    precio: '850.00',
    stock: 100,
    stockMinimo: 5,
    disponible: true,
    categoria: 'Bebidas',
  },
  {
    nombre: 'Café negro',
    descripcion: null,
    precio: '600.00',
    stock: 100,
    stockMinimo: 5,
    disponible: true,
    categoria: 'Bebidas',
  },
  {
    nombre: 'Cappuccino',
    descripcion: null,
    precio: '950.00',
    stock: 80,
    stockMinimo: 5,
    disponible: true,
    categoria: 'Bebidas',
  },
  {
    nombre: 'Jugo de naranja',
    descripcion: null,
    precio: '700.00',
    stock: 50,
    stockMinimo: 5,
    disponible: true,
    categoria: 'Bebidas',
  },
  {
    nombre: 'Medialuna',
    descripcion: null,
    precio: '450.00',
    stock: 60,
    stockMinimo: 5,
    disponible: true,
    categoria: 'Comida',
  },
  {
    nombre: 'Sándwich de miga',
    descripcion: null,
    precio: '1200.00',
    stock: 40,
    stockMinimo: 5,
    disponible: true,
    categoria: 'Comida',
  },
  {
    nombre: 'Empanada',
    descripcion: null,
    precio: '650.00',
    stock: 50,
    stockMinimo: 5,
    disponible: true,
    categoria: 'Comida',
  },
  {
    nombre: 'Chocotorta',
    descripcion: null,
    precio: '1500.00',
    stock: 20,
    stockMinimo: 5,
    disponible: true,
    categoria: 'Postres',
  },
  {
    nombre: 'Alfajor',
    descripcion: null,
    precio: '400.00',
    stock: 80,
    stockMinimo: 5,
    disponible: true,
    categoria: 'Postres',
  },
  {
    nombre: 'Agua mineral',
    descripcion: null,
    precio: '500.00',
    stock: 100,
    stockMinimo: 5,
    disponible: true,
    categoria: 'Extras',
  },
];

export const SEED_MESAS: readonly SeedMesa[] = Array.from(
  { length: 12 },
  (_, index) => ({
    numero: index + 1,
    estado: 'libre' as const,
  }),
);
