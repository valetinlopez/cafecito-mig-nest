import { getMetadataArgsStorage } from 'typeorm';
import { Producto } from './producto.entity.js';

describe('Producto entity', () => {
  it('mapea tabla, columnas y la relación real con categorias, sin cascadas', () => {
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
    expect(relations.map((relation) => relation.propertyName)).toEqual([
      'categoria',
    ]);
    expect(relations[0]?.options.cascade).toBeUndefined();
  });
});