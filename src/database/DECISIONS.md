# Decisiones — `database`

---

## D-01 — `DatabaseModule.forRoot()` en vez de `TypeOrmModule` directo

**Decisión:** encapsular la conexión en un módulo propio con `forRoot()`.

**Motivo:** una sola puerta de entrada, opciones testeables sin levantar Nest y
separación clara entre configuración (`config`) y conexión (`database`).

---

## D-02 — `autoLoadEntities: true`

**Decisión:** las entities se cargan desde `TypeOrmModule.forFeature()`.

**Motivo:** evita una lista central de entities que se desincroniza al agregar
módulos. Cada feature module es dueño de su entity.

---

## D-03 — Opciones compartidas con el CLI

**Decisión:** `createDataSourceOptions` es la única fuente de opciones; el CLI y
Nest la reutilizan.

**Motivo:** si el CLI y el runtime usan configuraciones distintas, las
migraciones generadas no representan lo que corre en producción.

---

## D-04 — Pool preparado para Neon

**Decisión:** `idleTimeoutMillis` de 4 minutos, `keepAlive: true` y
`poolErrorHandler` que solo loguea.

**Motivo:** Neon suspende la base a los 5 minutos y cierra conexiones. Sin esto,
la primera request tras inactividad falla con una conexión muerta. Replica el
`pool_pre_ping` del legacy (CFB-157).

---

## D-05 — Logging en errores por defecto

**Decisión:** `logging: ['error']`; queries solo con `DB_LOGGING=true`.

**Motivo:** el legacy desactivó `echo=True` porque llenaba la consola (CFB-145).
El log de queries se habilita puntualmente para depurar.

---

## D-06 — Migraciones compiladas desde `dist/`

**Decisión:** el glob apunta a `dist/database/migrations/*.js` y los scripts
hacen `build` antes.

**Motivo:** TypeORM necesita los decoradores compilados; ejecutar el CLI sobre
`src/*.ts` requiere `ts-node`, que no está en el stack.

---

## D-07 — `synchronize` nunca en producción

**Decisión:** la opción depende de `database.config.ts`, que la fuerza a `false`
si `NODE_ENV=production`.

**Motivo:** la base es compartida con datos reales. Un `synchronize` accidental
puede eliminar columnas.

**Verificación:** `typeorm-options.spec.ts` + revisión del `.env` de deploy.

---

## D-08 — `applicationName` fijo

**Decisión:** `cafecito-backend-nest`.

**Motivo:** permite identificar las conexiones del backend en
`pg_stat_activity` y distinguirlas del legacy Python durante la migración.
