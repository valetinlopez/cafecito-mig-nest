import { FindOperator } from 'typeorm';
import type {
  DataSource,
  EntityManager,
  FindManyOptions,
  ObjectLiteral,
  Repository,
} from 'typeorm';

type Row = Record<string, unknown>;

/** Clase de una entity: alcanza con su nombre y un constructor sin argumentos. */
type EntityClass<T = object> = new () => T;

interface RelationConfig {
  kind: 'one' | 'many';
  target: EntityClass;
  /** `one`: columna de esta entity. `many`: columna de la entity hija. */
  foreignKey: string;
}

interface EntityConfig {
  /** Valores que en la base real pone un `DEFAULT` de columna. */
  defaults?: () => Row;
  relations?: Record<string, RelationConfig>;
}

export type RawQueryResolver = (params: Row, db: InMemoryDataSource) => Row[];

export interface InMemoryDataSourceConfig {
  entities?: Record<string, EntityConfig>;
  /** Resultado de cada agregación, con clave `<alias>:<primer campo>`. */
  rawQueries?: Record<string, RawQueryResolver>;
}

export interface InMemoryDataSource {
  readonly manager: EntityManager;
  getRepository<T extends ObjectLiteral>(target: EntityClass<T>): Repository<T>;
  transaction<T>(run: (manager: EntityManager) => Promise<T>): Promise<T>;
  seed<T extends ObjectLiteral>(
    target: EntityClass<T>,
    rows: Partial<T>[],
  ): void;
  /** Lectura directa para verificar el estado desde un test. */
  rows<T extends ObjectLiteral>(target: EntityClass<T>): T[];
  reset(): void;
}

function matchesCondition(actual: unknown, expected: unknown): boolean {
  if (!(expected instanceof FindOperator)) {
    return actual === expected;
  }

  const operator: FindOperator<unknown> = expected;
  switch (operator.type) {
    case 'in':
      return (operator.value as unknown[]).includes(actual);
    case 'moreThanOrEqual':
      return (actual as number) >= (operator.value as number);
    default:
      throw new Error(`Operador sin soporte en memoria: ${operator.type}`);
  }
}

function matchesWhere(row: Row, where: Row = {}): boolean {
  return Object.entries(where).every(([campo, expected]) =>
    matchesCondition(row[campo], expected),
  );
}

function compareValues(a: unknown, b: unknown): number {
  const left = a instanceof Date ? a.getTime() : (a as number | string);
  const right = b instanceof Date ? b.getTime() : (b as number | string);
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

/** Convierte un error síncrono en una promesa rechazada, como un driver real. */
function attempt<T>(operation: () => T | PromiseLike<T>): Promise<T> {
  return new Promise((resolve) => {
    resolve(operation());
  });
}

class InMemoryQueryBuilder {
  private firstSelect = '';
  private readonly params: Row = {};

  constructor(
    private readonly alias: string,
    private readonly resolve: (key: string, params: Row) => Row[],
  ) {}

  select(_expression: string, selection: string): this {
    this.firstSelect = selection;
    return this;
  }

  where(_condition: string, params: Row = {}): this {
    Object.assign(this.params, params);
    return this;
  }

  andWhere(condition: string, params: Row = {}): this {
    return this.where(condition, params);
  }

  setParameter(name: string, value: unknown): this {
    this.params[name] = value;
    return this;
  }

  addSelect(): this {
    return this;
  }

  leftJoin(): this {
    return this;
  }

  innerJoin(): this {
    return this;
  }

  groupBy(): this {
    return this;
  }

  addGroupBy(): this {
    return this;
  }

  orderBy(): this {
    return this;
  }

  addOrderBy(): this {
    return this;
  }

  take(): this {
    return this;
  }

  limit(): this {
    return this;
  }

  getRawMany(): Promise<Row[]> {
    return attempt(() =>
      this.resolve(`${this.alias}:${this.firstSelect}`, this.params),
    );
  }

  getRawOne(): Promise<Row | undefined> {
    return this.getRawMany().then((rows) => rows[0]);
  }
}

/**
 * Doble de la capa de TypeORM para probar la aplicación completa sin PostgreSQL.
 *
 * Reemplaza solo el `DataSource`: controllers, guards, pipes, services y DTOs son
 * los reales, así que las reglas de negocio se ejecutan de verdad. Es un almacén
 * tonto: guarda filas, las filtra y las ordena.
 *
 * **Lo que no prueba** y queda para la base real (MIG-44, guía manual):
 * SQL, mapeo de columnas, transformers, restricciones, bloqueos y rollback. Las
 * agregaciones (`createQueryBuilder`) no se ejecutan: las resuelve a mano cada
 * test en `rawQueries`, y una consulta sin resolver hace fallar el test.
 */
export function createInMemoryDataSource(
  config: InMemoryDataSourceConfig = {},
): InMemoryDataSource {
  const tables = new Map<string, Row[]>();

  const tableOf = (target: EntityClass): Row[] => {
    let table = tables.get(target.name);
    if (table === undefined) {
      table = [];
      tables.set(target.name, table);
    }
    return table;
  };

  const relationsOf = (target: EntityClass): Record<string, RelationConfig> =>
    config.entities?.[target.name]?.relations ?? {};

  const hydrate = (target: EntityClass, row: Row, relations: Row = {}): Row => {
    const hydrated = { ...row };
    for (const name of Object.keys(relations)) {
      const relation = relationsOf(target)[name];
      if (relation === undefined) {
        throw new Error(`Relación sin configurar: ${target.name}.${name}`);
      }
      const related = tableOf(relation.target);
      if (relation.kind === 'one') {
        const parent = related.find(
          (candidate) => candidate.id === row[relation.foreignKey],
        );
        hydrated[name] = parent === undefined ? undefined : { ...parent };
      } else {
        hydrated[name] = related
          .filter((child) => child[relation.foreignKey] === row.id)
          .map((child) => ({ ...child }));
      }
    }
    return hydrated;
  };

  const findRows = (
    target: EntityClass,
    options: FindManyOptions = {},
  ): Row[] => {
    const rows = tableOf(target).filter((row) =>
      matchesWhere(row, options.where as Row | undefined),
    );
    const order = Object.entries((options.order ?? {}) as Row);
    rows.sort((a, b) => {
      for (const [campo, direction] of order) {
        const result = compareValues(a[campo], b[campo]);
        if (result !== 0) return direction === 'DESC' ? -result : result;
      }
      return 0;
    });
    return rows.map((row) =>
      hydrate(target, row, options.relations as Row | undefined),
    );
  };

  const saveRow = (target: EntityClass, entity: Row): Row => {
    const relations = relationsOf(target);
    const columns = Object.fromEntries(
      Object.entries(entity).filter(([campo]) => !(campo in relations)),
    );

    const table = tableOf(target);
    let stored = table.find((row) => row.id === entity.id);
    if (stored === undefined) {
      const nextId = Math.max(0, ...table.map((row) => row.id as number)) + 1;
      stored = {
        ...config.entities?.[target.name]?.defaults?.(),
        ...columns,
        id: entity.id ?? nextId,
      };
      table.push(stored);
    } else {
      Object.assign(stored, columns);
    }

    for (const [name, relation] of Object.entries(relations)) {
      const children = entity[name];
      if (relation.kind === 'many' && Array.isArray(children)) {
        for (const child of children as Row[]) {
          child[relation.foreignKey] = stored.id;
          saveRow(relation.target, child);
        }
      }
    }

    return Object.assign(entity, stored);
  };

  const resolveRawQuery = (key: string, params: Row): Row[] => {
    const resolver = config.rawQueries?.[key];
    if (resolver === undefined) {
      throw new Error(`Consulta agregada sin resolver: ${key}`);
    }
    return resolver(params, db);
  };

  const createRepository = (target: EntityClass) => ({
    create: (data: Row = {}): Row => ({ ...data }),
    find: (options?: FindManyOptions) =>
      attempt(() => findRows(target, options)),
    findBy: (where: Row) => attempt(() => findRows(target, { where })),
    findOne: (options: FindManyOptions) =>
      attempt(() => findRows(target, options)[0] ?? null),
    findOneBy: (where: Row) =>
      attempt(() => findRows(target, { where })[0] ?? null),
    count: (options?: FindManyOptions) =>
      attempt(() => findRows(target, options).length),
    save: (entity: Row) => attempt(() => saveRow(target, entity)),
    update: (where: Row, data: Row) =>
      attempt(() => {
        const rows = tableOf(target).filter((row) => matchesWhere(row, where));
        rows.forEach((row) => Object.assign(row, data));
        return { affected: rows.length, raw: [], generatedMaps: [] };
      }),
    delete: (where: Row) =>
      attempt(() => {
        const table = tableOf(target);
        const kept = table.filter((row) => !matchesWhere(row, where));
        const affected = table.length - kept.length;
        tables.set(target.name, kept);
        return { affected, raw: [] };
      }),
    createQueryBuilder: (alias: string) =>
      new InMemoryQueryBuilder(alias, resolveRawQuery),
  });

  const manager = {
    getRepository: createRepository,
    find: (target: EntityClass, options?: FindManyOptions) =>
      createRepository(target).find(options),
    create: (target: EntityClass, data?: Row) =>
      createRepository(target).create(data),
    save: (target: EntityClass, entity: Row) =>
      createRepository(target).save(entity),
    query: () => Promise.resolve([]),
  } as unknown as EntityManager;

  const db: InMemoryDataSource = {
    manager,
    getRepository: <T extends ObjectLiteral>(target: EntityClass<T>) =>
      createRepository(target) as unknown as Repository<T>,
    transaction: (run) => attempt(() => run(manager)),
    seed: (target, rows) => {
      tableOf(target).push(...rows.map((row) => ({ ...row })));
    },
    rows: <T extends ObjectLiteral>(target: EntityClass<T>) =>
      tableOf(target).map((row) => ({ ...row })) as T[],
    reset: () => {
      tables.clear();
    },
  };

  return db;
}

/**
 * Forma que `@nestjs/typeorm` necesita para resolver `forFeature()`.
 *
 * `isInitialized: false` evita que Nest intente cerrar una conexión inexistente.
 */
export function asNestDataSource(db: InMemoryDataSource): DataSource {
  return {
    ...db,
    options: { type: 'postgres' },
    entityMetadatas: [],
    isInitialized: false,
  } as unknown as DataSource;
}
