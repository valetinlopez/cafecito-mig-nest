import { In, MoreThanOrEqual, Not } from 'typeorm';
import { Categoria } from '../../src/categorias/entities/categoria.entity.js';
import { Mesa } from '../../src/mesas/entities/mesa.entity.js';
import { DetallePedido } from '../../src/pedidos/entities/detalle-pedido.entity.js';
import { Pedido } from '../../src/pedidos/entities/pedido.entity.js';
import {
  createInMemoryDataSource,
  type InMemoryDataSource,
} from './in-memory-data-source.js';

describe('createInMemoryDataSource', () => {
  let db: InMemoryDataSource;

  beforeEach(() => {
    db = createInMemoryDataSource({
      entities: {
        [Pedido.name]: {
          defaults: () => ({ fecha: new Date('2026-11-03T12:00:00.000Z') }),
          relations: {
            mesa: { kind: 'one', target: Mesa, foreignKey: 'mesaId' },
            detalles: {
              kind: 'many',
              target: DetallePedido,
              foreignKey: 'pedidoId',
            },
          },
        },
      },
      rawQueries: {
        'mesa:total': () => [{ total: '12' }],
      },
    });
    db.seed(Mesa, [
      { id: 1, numero: 1, estado: 'libre' },
      { id: 2, numero: 2, estado: 'ocupada' },
    ]);
  });

  it('busca por igualdad y devuelve null sin coincidencias', async () => {
    const repository = db.getRepository(Mesa);

    await expect(repository.findOneBy({ id: 2 })).resolves.toMatchObject({
      numero: 2,
    });
    await expect(repository.findOne({ where: { id: 9 } })).resolves.toBeNull();
  });

  it('entiende In y MoreThanOrEqual, y falla con un operador desconocido', async () => {
    const repository = db.getRepository(Mesa);

    await expect(
      repository.find({ where: { estado: In(['ocupada']) } }),
    ).resolves.toHaveLength(1);
    await expect(
      repository.find({ where: { numero: MoreThanOrEqual(2) } }),
    ).resolves.toHaveLength(1);
    await expect(
      repository.find({ where: { estado: Not('libre') } }),
    ).rejects.toThrow('Operador sin soporte en memoria: not');
  });

  it('ordena por las claves indicadas', async () => {
    const mesas = await db
      .getRepository(Mesa)
      .find({ order: { numero: 'DESC' } });

    expect(mesas.map((mesa) => mesa.numero)).toEqual([2, 1]);
  });

  it('un cambio no persiste hasta llamar a save', async () => {
    const repository = db.getRepository(Mesa);
    const mesa = await repository.findOneBy({ id: 1 });
    if (mesa === null) throw new Error('Mesa no encontrada');

    mesa.estado = 'reservada';
    await expect(repository.findOneBy({ id: 1 })).resolves.toMatchObject({
      estado: 'libre',
    });

    await repository.save(mesa);
    await expect(repository.findOneBy({ id: 1 })).resolves.toMatchObject({
      estado: 'reservada',
    });
  });

  it('asigna id y defaults al insertar', async () => {
    const repository = db.getRepository(Pedido);

    const saved = await repository.save(
      repository.create({
        mesaId: 1,
        usuarioId: 1,
        estado: 'pendiente',
        total: 10,
      }),
    );

    expect(saved.id).toBe(1);
    expect(saved.fecha).toEqual(new Date('2026-11-03T12:00:00.000Z'));
  });

  it('guarda los hijos en cascada e hidrata solo las relaciones pedidas', async () => {
    const repository = db.getRepository(Pedido);
    const detalle = db
      .getRepository(DetallePedido)
      .create({ productoId: 4, cantidad: 2, subtotal: 100 });
    const saved = await repository.save(
      repository.create({
        mesaId: 1,
        usuarioId: 1,
        estado: 'pendiente',
        total: 100,
        detalles: [detalle],
      }),
    );

    const sinRelaciones = await repository.findOneBy({ id: saved.id });
    expect(sinRelaciones).not.toHaveProperty('mesa');
    expect(sinRelaciones).not.toHaveProperty('detalles');

    const hidratado = await repository.findOne({
      where: { id: saved.id },
      relations: { mesa: true, detalles: true },
    });
    expect(hidratado?.mesa).toMatchObject({ numero: 1 });
    expect(hidratado?.detalles).toEqual([
      expect.objectContaining({ id: 1, pedidoId: saved.id, productoId: 4 }),
    ]);
  });

  it('update y delete informan las filas afectadas', async () => {
    db.seed(Categoria, [{ id: 1, nombre: 'Bebidas' }]);
    const mesas = db.getRepository(Mesa);

    await expect(
      mesas.update(
        { id: 1, numero: MoreThanOrEqual(5) },
        { estado: 'ocupada' },
      ),
    ).resolves.toMatchObject({ affected: 0 });
    await expect(
      mesas.update({ id: 1 }, { estado: 'ocupada' }),
    ).resolves.toMatchObject({ affected: 1 });
    await expect(
      db.getRepository(Categoria).delete({ id: 1 }),
    ).resolves.toMatchObject({ affected: 1 });
    await expect(
      db.getRepository(Categoria).delete({ id: 1 }),
    ).resolves.toMatchObject({ affected: 0 });
  });

  it('expone el manager transaccional sobre los mismos datos', async () => {
    await db.transaction(async (manager) => {
      const nueva = manager.create(Mesa, { numero: 3, estado: 'libre' });
      await manager.save(Mesa, nueva);
      await manager.query('SELECT pg_advisory_xact_lock($1, $2)', [1, 2]);
    });

    const mesas = await db.manager.find(Mesa, { where: { numero: 3 } });
    expect(mesas).toHaveLength(1);
  });

  it('resuelve una consulta agregada por alias y primer campo', async () => {
    const raw = await db
      .getRepository(Mesa)
      .createQueryBuilder('mesa')
      .select('COUNT(mesa.id)', 'total')
      .getRawOne<{ total: string }>();

    expect(raw).toEqual({ total: '12' });
  });

  it('falla de forma explícita con una consulta agregada sin resolver', async () => {
    await expect(
      db
        .getRepository(Mesa)
        .createQueryBuilder('mesa')
        .select('mesa.id', 'desconocida')
        .getRawMany(),
    ).rejects.toThrow('Consulta agregada sin resolver: mesa:desconocida');
  });

  it('reset vacía los datos', async () => {
    db.reset();

    await expect(db.getRepository(Mesa).find()).resolves.toEqual([]);
  });
});
