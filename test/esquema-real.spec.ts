import { getMetadataArgsStorage } from 'typeorm';
import { Caja } from '../src/caja/entities/caja.entity.js';
import { Categoria } from '../src/categorias/entities/categoria.entity.js';
import { Mesa } from '../src/mesas/entities/mesa.entity.js';
import { Pago } from '../src/pagos/entities/pago.entity.js';
import { DetallePedido } from '../src/pedidos/entities/detalle-pedido.entity.js';
import { Pedido } from '../src/pedidos/entities/pedido.entity.js';
import { Producto } from '../src/productos/entities/producto.entity.js';
import { Usuario } from '../src/users/entities/usuario.entity.js';

/**
 * Lo que `npm run schema:log` validó contra una copia de producción (MIG-44),
 * para detectarlo en CI, donde no hay base. Si se cambia una entity, hay que
 * volver a correr `schema:log` contra una branch de Neon.
 */
const INDICES: [new () => object, string, string[], boolean][] = [
  [Caja, 'ix_cajas_id', ['id'], false],
  [Categoria, 'ix_categorias_id', ['id'], false],
  [DetallePedido, 'ix_detalle_pedidos_id', ['id'], false],
  [Mesa, 'ix_mesas_id', ['id'], false],
  [Pago, 'ix_pagos_id', ['id'], false],
  [Pedido, 'ix_pedidos_id', ['id'], false],
  [Producto, 'ix_productos_id', ['id'], false],
  [Usuario, 'ix_usuarios_id', ['id'], false],
  [Usuario, 'ix_usuarios_email', ['email'], true],
];

const SIN_NOT_NULL: [new () => object, string][] = [
  [Caja, 'fechaApertura'],
  [Caja, 'estado'],
  [Mesa, 'estado'],
  [Pago, 'fecha'],
  [Pedido, 'estado'],
  [Pedido, 'total'],
  [Pedido, 'fecha'],
  [Producto, 'stock'],
  [Producto, 'disponible'],
  [Usuario, 'activo'],
];

describe('Mapeo contra el esquema real', () => {
  const metadata = getMetadataArgsStorage();

  function columna(target: new () => object, propertyName: string) {
    return metadata.columns.find(
      (entry) => entry.target === target && entry.propertyName === propertyName,
    );
  }

  it.each(INDICES)(
    '%o declara el índice real %s',
    (target, name, columns, unique) => {
      const index = metadata.indices.find(
        (entry) => entry.target === target && entry.name === name,
      );

      expect(index?.columns).toEqual(columns);
      expect(index?.unique ?? false).toBe(unique);
    },
  );

  it.each(SIN_NOT_NULL)(
    '%o.%s admite NULL como la columna real',
    (target, propertyName) => {
      expect(columna(target, propertyName)?.options.nullable).toBe(true);
    },
  );

  it('ninguna columna declara un default, porque la base no tiene ninguno', () => {
    const entities = new Set(INDICES.map(([target]) => target));
    const conDefault = metadata.columns
      .filter(
        (entry) =>
          entities.has(entry.target as new () => object) &&
          entry.options.default !== undefined,
      )
      .map((entry) => entry.propertyName);

    expect(conDefault).toEqual([]);
  });

  it('respeta el largo real de las columnas de texto', () => {
    expect(columna(Mesa, 'estado')?.options.length).toBe(30);
    expect(columna(Producto, 'descripcion')?.options.length).toBe(255);
  });

  it('pagos no declara columnas que la base no tiene', () => {
    expect(columna(Pago, 'cajaId')).toBeUndefined();
    expect(columna(Pago, 'usuarioId')).toBeUndefined();
    expect(metadata.uniques.filter(({ target }) => target === Pago)).toEqual(
      [],
    );
  });

  it('usuarios usa el índice único real, no una restricción', () => {
    expect(metadata.uniques.filter(({ target }) => target === Usuario)).toEqual(
      [],
    );
  });

  it('productos declara la FK real hacia categorias', () => {
    const joinColumn = metadata.joinColumns.find(
      ({ target }) => target === Producto,
    );

    expect(joinColumn?.name).toBe('categoria_id');
    expect(joinColumn?.foreignKeyConstraintName).toBe(
      'productos_categoria_id_fkey',
    );
  });
});
