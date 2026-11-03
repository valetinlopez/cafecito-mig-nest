import {
  arrayOf,
  findShapeErrors,
  nullable,
  oneOf,
} from './frontend-shapes.js';

describe('findShapeErrors', () => {
  const shape = {
    id: 'number',
    nombre: 'string',
    activo: 'boolean',
    fecha: 'iso',
    descripcion: nullable('string'),
    estado: oneOf('libre', 'ocupada'),
    categoria: { id: 'number' },
    detalles: arrayOf({ subtotal: 'number' }),
  } as const;

  const valid = {
    id: 1,
    nombre: 'Café',
    activo: true,
    fecha: '2026-10-19T20:24:10.000Z',
    descripcion: null,
    estado: 'libre',
    categoria: { id: 2 },
    detalles: [{ subtotal: 850.5 }],
  };

  it('no reporta errores con un objeto válido anidado', () => {
    expect(findShapeErrors(valid, shape)).toEqual([]);
  });

  it('acepta un valor en un campo nullable', () => {
    expect(
      findShapeErrors({ ...valid, descripcion: 'Con leche' }, shape),
    ).toEqual([]);
  });

  it('detecta un campo faltante', () => {
    const { nombre: _nombre, ...incompleto } = valid;

    expect(findShapeErrors(incompleto, shape)).toEqual([
      'nombre: campo faltante',
    ]);
  });

  it('detecta un campo que el frontend no espera', () => {
    expect(
      findShapeErrors({ ...valid, password_hash: 'secreto' }, shape),
    ).toEqual(['password_hash: campo inesperado']);
  });

  it('detecta un decimal serializado como string', () => {
    expect(
      findShapeErrors({ ...valid, detalles: [{ subtotal: '850.50' }] }, shape),
    ).toEqual(['detalles[0].subtotal: se esperaba number, llegó "850.50"']);
  });

  it('detecta un número que no es finito', () => {
    expect(findShapeErrors({ ...valid, id: Number.NaN }, shape)).toEqual([
      'id: se esperaba number, llegó null',
    ]);
  });

  it('detecta una fecha sin Z', () => {
    expect(
      findShapeErrors({ ...valid, fecha: '2026-10-19T20:24:10' }, shape),
    ).toEqual([
      'fecha: se esperaba ISO-8601 UTC con Z, llegó "2026-10-19T20:24:10"',
    ]);
  });

  it('detecta un valor fuera del enum', () => {
    expect(findShapeErrors({ ...valid, estado: 'rota' }, shape)).toEqual([
      'estado: se esperaba libre | ocupada, llegó "rota"',
    ]);
  });

  it('detecta null donde el campo no es nullable', () => {
    expect(findShapeErrors({ ...valid, nombre: null }, shape)).toEqual([
      'nombre: se esperaba string, llegó null',
    ]);
  });

  it('detecta un campo omitido aunque sea nullable', () => {
    const { descripcion: _descripcion, ...incompleto } = valid;

    expect(findShapeErrors(incompleto, shape)).toEqual([
      'descripcion: campo faltante',
    ]);
  });

  it('detecta un objeto o una lista con el tipo equivocado', () => {
    expect(
      findShapeErrors({ ...valid, categoria: 2, detalles: {} }, shape),
    ).toEqual([
      'categoria: se esperaba objeto, llegó 2',
      'detalles: se esperaba lista, llegó {}',
    ]);
  });

  it('valida una lista en la raíz', () => {
    expect(findShapeErrors([{ id: 'x' }], arrayOf({ id: 'number' }))).toEqual([
      '[0].id: se esperaba number, llegó "x"',
    ]);
  });
});
