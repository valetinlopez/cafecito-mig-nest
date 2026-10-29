import { DataSource, getMetadataArgsStorage } from 'typeorm';
import { numericTransformer } from '../../common/transformers/numeric.transformer.js';
import { utcTimestampTransformer } from '../../common/transformers/utc-timestamp.transformer.js';
import { Mesa } from '../../mesas/entities/mesa.entity.js';
import { Pago } from '../../pagos/entities/pago.entity.js';
import { Producto } from '../../productos/entities/producto.entity.js';
import { Usuario } from '../../users/entities/usuario.entity.js';
import { DetallePedido } from './detalle-pedido.entity.js';
import { Pedido } from './pedido.entity.js';

describe('Pedido entity', () => {
  const metadata = getMetadataArgsStorage();

  it('mapea la tabla pedidos', () => {
    const table = metadata.tables.find((entry) => entry.target === Pedido);

    expect(table?.name).toBe('pedidos');
  });

  it('mapea las columnas al snake_case del legacy', () => {
    const columns = metadata.columns
      .filter((entry) => entry.target === Pedido)
      .map((column) => [
        column.propertyName,
        column.options.name ?? column.propertyName,
      ]);

    expect(columns).toEqual([
      ['id', 'id'],
      ['mesaId', 'mesa_id'],
      ['usuarioId', 'usuario_id'],
      ['estado', 'estado'],
      ['total', 'total'],
      ['fecha', 'fecha'],
    ]);
  });

  it('declara las relaciones del ticket con Mesa, Usuario, DetallePedido y Pago', () => {
    const relations = metadata.relations
      .filter((entry) => entry.target === Pedido)
      .map((relation) => [relation.propertyName, relation.relationType]);

    expect(relations).toEqual([
      ['mesa', 'many-to-one'],
      ['usuario', 'many-to-one'],
      ['detalles', 'one-to-many'],
      ['pagos', 'one-to-many'],
    ]);
  });

  it('solo permite insertar detalles en cascada', () => {
    const relations = metadata.relations.filter(
      (entry) => entry.target === Pedido,
    );
    const detalles = relations.find(
      (relation) => relation.propertyName === 'detalles',
    );
    const pagos = relations.find(
      (relation) => relation.propertyName === 'pagos',
    );

    expect(detalles?.options.cascade).toEqual(['insert']);
    expect(pagos?.options.cascade).toBeUndefined();
  });

  it('declara las FK con el nombre que genera PostgreSQL', () => {
    const joinColumns = metadata.joinColumns
      .filter((entry) => entry.target === Pedido)
      .map((joinColumn) => [
        joinColumn.propertyName,
        joinColumn.name,
        joinColumn.foreignKeyConstraintName,
      ]);

    expect(joinColumns).toEqual([
      ['mesa', 'mesa_id', 'pedidos_mesa_id_fkey'],
      ['usuario', 'usuario_id', 'pedidos_usuario_id_fkey'],
    ]);
  });

  it('convierte total y fecha en los bordes de persistencia', () => {
    const columns = metadata.columns.filter((entry) => entry.target === Pedido);
    const total = columns.find((entry) => entry.propertyName === 'total');
    const fecha = columns.find((entry) => entry.propertyName === 'fecha');

    expect(total?.options.transformer).toBe(numericTransformer);
    expect(fecha?.options.transformer).toBe(utcTimestampTransformer);
  });

  it('exige total con precisión decimal(10,2) y default 0', () => {
    const total = metadata.columns.find(
      (entry) => entry.target === Pedido && entry.propertyName === 'total',
    );

    expect(total?.options.type).toBe('numeric');
    expect(total?.options.precision).toBe(10);
    expect(total?.options.scale).toBe(2);
    expect(total?.options.default).toBe(0);
  });

  it('arranca en pendiente con varchar(30)', () => {
    const estado = metadata.columns.find(
      (entry) => entry.target === Pedido && entry.propertyName === 'estado',
    );

    expect(estado?.options.type).toBe('varchar');
    expect(estado?.options.length).toBe(30);
    expect(estado?.options.default).toBe('pendiente');
  });

  it('resuelve el metadata de TypeORM con las relaciones cruzadas', async () => {
    const dataSource = new DataSource({
      type: 'postgres',
      entities: [Pedido, DetallePedido, Mesa, Usuario, Producto, Pago],
    });

    await (
      dataSource as unknown as { buildMetadatas(): Promise<void> }
    ).buildMetadatas();

    const pedidoMetadata = dataSource.entityMetadatas.find(
      (entity) => entity.target === Pedido,
    );

    expect(
      pedidoMetadata?.relations.map((relation) => relation.propertyName),
    ).toEqual(['mesa', 'usuario', 'detalles', 'pagos']);
  });
});
