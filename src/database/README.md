# Módulo `database`

| Campo       | Valor                                                   |
| ----------- | ------------------------------------------------------- |
| Estado      | **Implementado**                                        |
| Ticket      | MIG-19 — conexión PostgreSQL y opciones de TypeORM      |
| Responsable | `DataSource` global, pool, migraciones                  |
| Tests       | `typeorm-options.spec.ts` + `test/database.e2e-spec.ts` |

---

## 1. Responsabilidad

Publicar la conexión PostgreSQL de forma **global** para que cada feature module
solo declare sus entities con `TypeOrmModule.forFeature([...])`. También expone
las opciones compartidas con el CLI de migraciones.

No expone endpoints.

---

## 2. Estructura

```
src/database/
├── database.module.ts      # forRoot(): TypeOrmModule.forRootAsync
├── typeorm-options.ts      # opciones compartidas Nest + CLI
├── data-source.ts          # DataSource para el CLI de TypeORM
├── typeorm-options.spec.ts
├── migrations/             # migraciones versionadas
├── README.md
├── CONTRACT.md
└── DECISIONS.md
```

---

## 3. Registro

```ts
// src/app.module.ts
DatabaseModule.forRoot(),
```

`DatabaseModule.forRoot()` importa `TypeOrmModule.forRootAsync` con
`autoLoadEntities: true`. Las entities se registran desde cada feature module.

---

## 4. Opciones relevantes

| Opción                    | Valor / origen                                |
| ------------------------- | --------------------------------------------- |
| `type`                    | `postgres`                                    |
| `url`                     | `database.url` (obligatoria)                  |
| `applicationName`         | `cafecito-backend-nest`                       |
| `synchronize`             | de `database.config.ts` (nunca en producción) |
| `migrations`              | `dist/database/migrations/*.js`               |
| `logging`                 | errores; queries solo con `DB_LOGGING=true`   |
| `poolSize`                | `DB_POOL_MAX` (default 10)                    |
| `connectTimeoutMS`        | `DB_CONNECT_TIMEOUT_MS` (default 10 s)        |
| `extra.idleTimeoutMillis` | 4 min, por debajo del autosuspend de Neon     |
| `extra.keepAlive`         | `true`                                        |
| `poolErrorHandler`        | loguea y no tumba el proceso                  |

### 4.1 Zona horaria y columnas `timestamp`

La base es compartida con el backend FastAPI, que guarda las fechas como
`timestamp without time zone` con UTC _naive_. `pg` interpreta esas columnas con
la zona **del proceso**, por eso:

- `main.ts` y `data-source.ts` llaman a `pinProcessTimezone()` antes de crear la
  conexión: el proceso queda en UTC o el arranque falla (ADR 0007).
- Las entities usan `utcTimestampTransformer` en esas columnas.
- No se cambia el tipo de columna: el esquema compartido no se toca.

---

## 5. Migraciones

```bash
npm run migration:generate -- src/database/migrations/Nombre
npm run migration:run
npm run migration:revert
npm run migration:show
npm run schema:log
```

Los scripts compilan antes porque TypeORM necesita los decoradores en `dist/`.
El `DataSource` del CLI (`src/database/data-source.ts`) carga `.env` si existe.

---

## 6. Regla de oro

La base de Neon es **compartida con producción**. El esquema no se modifica solo:

- `synchronize` únicamente en desarrollo local.
- Todo cambio de esquema va por migración revisada.
- `schema:log` debe quedar limpio (MIG-44).

---

## 7. Tests

| Archivo                     | Cubre                                                  |
| --------------------------- | ------------------------------------------------------ |
| `typeorm-options.spec.ts`   | URL obligatoria, SSL, pool, logging, `migrationsRun`.  |
| `test/database.e2e-spec.ts` | Smoke real con `E2E_DATABASE=true` (nunca producción). |

---

## 8. Referencias

- [`CONTRACT.md`](./CONTRACT.md) · [`DECISIONS.md`](./DECISIONS.md)
- `README.md` raíz §Base de datos
- `docs/architecture.md` §7 y §9
