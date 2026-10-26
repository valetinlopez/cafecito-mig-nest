import { getMetadataArgsStorage } from 'typeorm';
import { Producto } from './producto.entity.js';

describe('Producto entity', () => {
  it('mapea tabla y columnas sin inventar relaciones ni cascadas', () => {
    const metadata = getMetadataArgsStorage();
    const table = metadata.tables.find((entry) => entry.target === Producto);
    const columns = metadata.columns.filter(
      (entry) => entry.target === Producto,
    );
    const relations = metadata.relations.filter(
      (entry) => entry.target === Producto,
    );

    expect(table?.name).toBe('productos');
    expect(columns.map((column) => column.propertyName)).toEqual([
      'id',
      'nombre',
      'descripcion',
      'precio',
      'stock',
      'stockMinimo',
      'disponible',
      'categoriaId',
    ]);
    expect(relations).toEqual([]);
  });
});