# Utilidades de test (`test/`)

| Campo    | Valor                                                                             |
| -------- | --------------------------------------------------------------------------------- |
| Ticket   | MIG-21 — Setup de testing                                                         |
| Runner   | Vitest 4 + `@nestjs/testing`                                                      |
| Config   | [`vitest.config.ts`](../vitest.config.ts)                                         |
| Helpers  | `test/utils/mock-repository.ts`, `mock-query-builder.ts`, `test-module.helper.ts` |
| Decisión | [ADR 0006](../docs/adr/0006-vitest-runner-tests.md)                               |

---

## 1. Runner: Vitest, no Jest

El ticket MIG-21 menciona Jest porque es el default del CLI de Nest. El
boilerplate ya usa Vitest (`package.json`, configs, `AGENTS.md` y 12 specs
existentes), así que se mantiene un solo runner y se documenta la equivalencia
en [ADR 0006](../docs/adr/0006-vitest-runner-tests.md).

Lo que en Jest sería `moduleNameMapper`, acá lo resuelve `vite-tsconfig-paths`
leyendo los `paths` de `tsconfig.json` (hoy no hay alias declarados).

---

## 2. Estructura

```
test/
├── setup-env.ts              # variables descartables para unitarios y e2e
├── *.e2e-spec.ts             # contrato HTTP (config e2e)
└── utils/                    # utilidades compartidas por los unitarios
    ├── mock-query-builder.ts
    ├── mock-repository.ts
    ├── test-module.helper.ts
    └── *.spec.ts             # tests de las propias utilidades
```

Las utilidades **no van en `src/`**: no deben empaquetarse en producción
(`src/common/DECISIONS.md` D-07).

---

## 3. Helpers

### 3.1 `createMockRepository<T>()`

Crea un `Repository<T>` falso con las operaciones que usan los services:
`find`, `findBy`, `findAndCount`, `findOne`, `findOneBy`, `create`, `save`,
`update`, `delete`, `count` y `createQueryBuilder`.

```ts
import { createMockRepository } from '../../test/utils/mock-repository.js';

const repository = createMockRepository<Categoria>();

repository.find.mockResolvedValue([{ id: 1, nombre: 'Bebidas' }]);
```

El QueryBuilder asociado queda en `repository.queryBuilder` para configurar
resultados y verificar llamadas.

### 3.2 `createMockQueryBuilder<T>()`

Devuelve un `SelectQueryBuilder<T>` falso, encadenable. Los métodos
`where`, `andWhere`, `leftJoinAndSelect`, `orderBy`, `setLock`, etc. devuelven el
mismo builder; los terminales (`getOne`, `getMany`, `getManyAndCount`,
`getCount`) se configuran con `mockResolvedValue`.

```ts
import { createMockQueryBuilder } from '../../test/utils/mock-query-builder.js';

const queryBuilder = createMockQueryBuilder<Mesa>();
queryBuilder.getOne.mockResolvedValue(mesa);
```

### 3.3 `provideMockRepository()` y `createServiceTestModule()`

`provideMockRepository(Entity, repository)` arma el provider de
`getRepositoryToken(Entity)`. `createServiceTestModule(Service, providers)`
compila el `TestingModule` y devuelve `{ module, service }`.

```ts
import { createMockRepository } from '../../test/utils/mock-repository.js';
import {
  createServiceTestModule,
  provideMockRepository,
} from '../../test/utils/test-module.helper.js';

const repository = createMockRepository<Categoria>();
const { module, service } = await createServiceTestModule(CategoriasService, [
  provideMockRepository(Categoria, repository),
]);

repository.find.mockResolvedValue([]);
await service.getAllCategorias();

await module.close();
```

Para un módulo arbitrario (controller, guard, provider suelto) usar
`createTestModule({ controllers, providers })`, que es un wrapper de
`Test.createTestingModule(...).compile()`.

---

## 4. Lock pesimista (`SELECT ... FOR UPDATE`)

El backend FastAPI verificaba `_for_update_arg`; acá el equivalente es
`setLock('pessimistic_write')` sobre el QueryBuilder:

```ts
const repository = createMockRepository<Mesa>();
repository.queryBuilder.getOne.mockResolvedValue(mesa);

const { service } = await createServiceTestModule(MesasService, [
  provideMockRepository(Mesa, repository),
]);

await service.getMesaParaCobro(1);

expect(repository.queryBuilder.setLock).toHaveBeenCalledWith(
  'pessimistic_write',
);
```

---

## 5. Reglas

- **Sin base de datos real** en unitarios: todo repositorio se mockea.
- Un mock por test (`beforeEach`); no compartir estado entre casos.
- Verificar la llamada (`toHaveBeenCalledWith`), no solo el resultado.
- Imports relativos con `.js`, también desde `test/`.
- Prohibido `any` y `console.log`; para tipos de mock usar `Mock` de `vitest`.
- Si falta una operación de `Repository`, se agrega al helper compartido; no se
  improvisa un mock local en el spec.
- Cerrar el módulo (`await module.close()`) en `afterEach` cuando se compile.

---

## 6. Cobertura

```bash
npm test           # unitarios
npm run test:watch # watch
npm run test:cov   # unitarios + cobertura
npm run test:e2e   # contrato HTTP
```

`test:cov` usa V8 y escribe `coverage/` (ignorado por git). Umbrales actuales:
90 % statements/lines, 85 % branches y 80 % functions.

Se excluyen del cálculo el bootstrap (`main.ts`, `app.setup.ts`,
`app.module.ts`), los `*.module.ts`, `*.controller.ts`, `*.entity.ts`,
`*.dto.ts`, `data-source.ts` y las migraciones. Los controllers se validan por
e2e, no por unitarios. El umbral de funciones queda en 80 porque
`auth.config.ts` todavía no tiene spec (MIG-22/23).

---

## 7. Verificación

```bash
npm run lint
npm run typecheck
npm test
npm run test:cov
npm run test:e2e
```
