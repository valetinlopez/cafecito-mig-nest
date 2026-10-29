import { getMetadataArgsStorage } from 'typeorm';
import { numericTransformer } from '../../common/transformers/numeric.transformer.js';
import { DetallePedido } from './detalle-pedido.entity.js';

describe('DetallePedido entity', () => {
  const metadata = getMetadataArgsStorage();

  it('mapea la tabla detalle_pedidos', () => {
    const table = metadata.tables.find(
      (entry) => entry.target === DetallePedido,
    );

    expect(table?.name).toBe('detalle_pedidos');
  });

  it('mapea las columnas al snake_case del legacy', () => {
    const columns = metadata.columns
      .filter((entry) => entry.target === DetallePedido)
      .map((column) => [
        column.propertyName,
        column.options.name ?? column.propertyName,
      ]);

    expect(columns).toEqual([
      ['id', 'id'],
      ['pedidoId', 'pedido_id'],
      ['productoId', 'producto_id'],
      ['cantidad', 'cantidad'],
      ['subtotal', 'subtotal'],
    ]);
  });

  it('declara las relaciones bidireccionales con Pedido y Producto', () => {
    const relations = metadata.relations
      .filter((entry) => entry.target === DetallePedido)
      .map((relation) => [
        relation.propertyName,
        relation.relationType,
        relation.options.nullable,
      ]);

    expect(relations).toEqual([
      ['pedido', 'many-to-one', false],
      ['producto', 'many-to-one', false],
    ]);
  });

  it('declara las FK con el nombre que genera PostgreSQL', () => {
    const joinColumns = metadata.joinColumns
      .filter((entry) => entry.target === DetallePedido)
      .map((joinColumn) => [
        joinColumn.propertyName,
        joinColumn.name,
        joinColumn.foreignKeyConstraintName,
      ]);

    expect(joinColumns).toEqual([
      ['pedido', 'pedido_id', 'detalle_pedidos_pedido_id_fkey'],
      ['producto', 'producto_id', 'detalle_pedidos_producto_id_fkey'],
    ]);
  });

  it('persiste subtotal como decimal(10,2) convertido a number', () => {
    const subtotal = metadata.columns.find(
      (entry) =>
        entry.target === DetallePedido && entry.propertyName === 'subtotal',
    );

    expect(subtotal?.options.type).toBe('numeric');
    expect(subtotal?.options.precision).toBe(10);
    expect(subtotal?.options.scale).toBe(2);
    expect(subtotal?.options.transformer).toBe(numericTransformer);
  });

  it('exige cantidad entera', () => {
    const cantidad = metadata.columns.find(
      (entry) =>
        entry.target === DetallePedido && entry.propertyName === 'cantidad',
    );

    expect(cantidad?.options.type).toBe('int');
    expect(cantidad?.options.nullable).toBeUndefined();
  });
});
