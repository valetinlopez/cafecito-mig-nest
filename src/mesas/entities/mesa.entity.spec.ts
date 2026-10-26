import { getMetadataArgsStorage } from 'typeorm';
import { Mesa } from './mesa.entity.js';

describe('Mesa entity', () => {
  it('mapea tabla, columnas y unique nombrada', () => {
    const metadata = getMetadataArgsStorage();
    const table = metadata.tables.find((entry) => entry.target === Mesa);
    const columns = metadata.columns.filter((entry) => entry.target === Mesa);
    const unique = metadata.uniques.find((entry) => entry.target === Mesa);

    expect(table?.name).toBe('mesas');
    expect(columns.map((column) => column.propertyName)).toEqual([
      'id',
      'numero',
      'estado',
    ]);
    expect(unique?.name).toBe('mesas_numero_key');
    expect(unique?.columns).toEqual(['numero']);
  });
});
