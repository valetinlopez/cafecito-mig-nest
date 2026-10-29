import { getMetadataArgsStorage } from 'typeorm';
import { numericTransformer } from '../../common/transformers/numeric.transformer.js';
import { utcTimestampTransformer } from '../../common/transformers/utc-timestamp.transformer.js';
import { Caja } from './caja.entity.js';

describe('Caja entity', () => {
  const metadata = getMetadataArgsStorage();

  it('mapea la tabla cajas sin relación ORM', () => {
    expect(metadata.tables.find((entry) => entry.target === Caja)?.name).toBe(
      'cajas',
    );
    expect(metadata.relations.filter((entry) => entry.target === Caja)).toEqual(
      [],
    );
  });

  it('mapea las columnas documentadas y mantiene total_ventas fuera de la tabla', () => {
    const columns = metadata.columns
      .filter((entry) => entry.target === Caja)
      .map((column) => [
        column.propertyName,
        column.options.name ?? column.propertyName,
      ]);

    expect(columns).toEqual([
      ['id', 'id'],
      ['fechaApertura', 'fecha_apertura'],
      ['fechaCierre', 'fecha_cierre'],
      ['montoInicial', 'monto_inicial'],
      ['montoFinal', 'monto_final'],
      ['estado', 'estado'],
    ]);
  });

  it('usa transformers compartidos para montos y fechas', () => {
    const columns = metadata.columns.filter((entry) => entry.target === Caja);

    expect(
      columns.find((column) => column.propertyName === 'montoInicial')?.options
        .transformer,
    ).toBe(numericTransformer);
    expect(
      columns.find((column) => column.propertyName === 'montoFinal')?.options
        .transformer,
    ).toBe(numericTransformer);
    expect(
      columns.find((column) => column.propertyName === 'fechaApertura')?.options
        .transformer,
    ).toBe(utcTimestampTransformer);
    expect(
      columns.find((column) => column.propertyName === 'fechaCierre')?.options
        .transformer,
    ).toBe(utcTimestampTransformer);
  });
});
