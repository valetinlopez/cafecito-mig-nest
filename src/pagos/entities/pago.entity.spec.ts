import { getMetadataArgsStorage } from 'typeorm';
import { numericTransformer } from '../../common/transformers/numeric.transformer.js';
import { utcTimestampTransformer } from '../../common/transformers/utc-timestamp.transformer.js';
import { Pago } from './pago.entity.js';

describe('Pago entity', () => {
  const metadata = getMetadataArgsStorage();

  it('mapea la tabla pagos', () => {
    const table = metadata.tables.find((entry) => entry.target === Pago);

    expect(table?.name).toBe('pagos');
  });

  it('mapea las columnas al snake_case del legacy', () => {
    const columns = metadata.columns
      .filter((entry) => entry.target === Pago)
      .map((column) => [
        column.propertyName,
        column.options.name ?? column.propertyName,
      ]);

    expect(columns).toEqual([
      ['id', 'id'],
      ['pedidoId', 'pedido_id'],
      ['cajaId', 'caja_id'],
      ['usuarioId', 'usuario_id'],
      ['metodoPago', 'metodo_pago'],
      ['monto', 'monto'],
      ['fecha', 'fecha'],
    ]);
  });

  it('declara el unique de pedido_id con el nombre real de PostgreSQL', () => {
    const unique = metadata.uniques.find((entry) => entry.target === Pago);

    expect(unique?.name).toBe('pagos_pedido_id_key');
    expect(unique?.columns).toEqual(['pedidoId']);
  });

  it('convierte monto y fecha en los bordes de persistencia', () => {
    const columns = metadata.columns.filter((entry) => entry.target === Pago);
    const monto = columns.find((entry) => entry.propertyName === 'monto');
    const fecha = columns.find((entry) => entry.propertyName === 'fecha');

    expect(monto?.options.transformer).toBe(numericTransformer);
    expect(fecha?.options.transformer).toBe(utcTimestampTransformer);
  });

  it('exige monto con precisión decimal(10,2)', () => {
    const monto = metadata.columns.find(
      (entry) => entry.target === Pago && entry.propertyName === 'monto',
    );

    expect(monto?.options.type).toBe('numeric');
    expect(monto?.options.precision).toBe(10);
    expect(monto?.options.scale).toBe(2);
  });

  it('declara la relación con Pedido reutilizando pedido_id', () => {
    const relations = metadata.relations
      .filter((entry) => entry.target === Pago)
      .map((relation) => [relation.propertyName, relation.relationType]);

    expect(relations).toEqual([['pedido', 'many-to-one']]);

    const joinColumn = metadata.joinColumns.find(
      (entry) => entry.target === Pago,
    );

    expect(joinColumn?.name).toBe('pedido_id');
    expect(joinColumn?.foreignKeyConstraintName).toBe('pagos_pedido_id_fkey');
  });
});
