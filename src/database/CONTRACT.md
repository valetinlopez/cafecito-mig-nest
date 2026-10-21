# Contrato — `database`

> Módulo de infraestructura: **no expone HTTP**. Contrato interno de la conexión
> y de las opciones que comparten Nest y el CLI.

---

## 1. API pública del módulo

```ts
class DatabaseModule {
  static forRoot(): DynamicModule;
}
```

Garantía: después de importarlo, existe un `DataSource` global inyectable y
`@InjectRepository(Entity)` funciona en cualquier feature module que registre la
entity con `forFeature`.

---

## 2. Funciones compartidas

```ts
createDataSourceOptions(config: DatabaseConfig): PostgresDataSourceOptions
createTypeOrmOptions(config: DatabaseConfig): TypeOrmModuleOptions
```

| Función                   | Consumidor                          |
| ------------------------- | ----------------------------------- |
| `createDataSourceOptions` | `src/database/data-source.ts` (CLI) |
| `createTypeOrmOptions`    | `DatabaseModule.forRoot()` (Nest)   |

`createTypeOrmOptions` agrega `autoLoadEntities: true`.

---

## 3. Validaciones

| Caso                                | Comportamiento                       |
| ----------------------------------- | ------------------------------------ |
| `config.url` vacía o `undefined`    | Lanza `Error` con mensaje en español |
| `DB_LOGGING=false`                  | Loguea solo `error`                  |
| `DB_LOGGING=true`                   | Loguea `query`, `error`, `warn`      |
| `ssl=undefined` y URL con `sslmode` | `pg` resuelve                        |
| Error en el pool                    | `poolErrorHandler` loguea y sigue    |

---

## 4. Garantías operativas

| Garantía                                  | Cómo                                                  |
| ----------------------------------------- | ----------------------------------------------------- |
| Conexiones ociosas no se reusan tras Neon | `idleTimeoutMillis` de 4 min                          |
| Un error de pool no tumba el proceso      | `poolErrorHandler`                                    |
| Migraciones aplicables desde el CLI       | `migrations` apunta a `dist/database/migrations/*.js` |
| Entidades cargadas sin listarlas a mano   | `autoLoadEntities: true`                              |

---

## 5. Fuera de alcance

- Endpoints de base de datos o health profundo.
- Gestión de réplicas o read/write splitting.
- Seeds de datos.
