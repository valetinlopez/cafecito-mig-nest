# Cafecitoapp — Backend NestJS

Backend de gestión gastronómica de Cafecitoapp, en migración de **FastAPI (Python)** a **NestJS**.

> El backend legacy en FastAPI permanece operativo hasta el cutover (MIG-42).

## Stack

- **NestJS 12** (Express) + **TypeScript 6** (ESM, `module: nodenext`)
- **TypeORM 1** + **PostgreSQL** (Neon en preprod/producción)
- **class-validator / class-transformer** para DTOs y validación del entorno
- **Passport + JWT** para autenticación
- **Vitest** para tests
- **ESLint + Prettier** para calidad de código

## Requisitos

- Node.js >= 24
- npm >= 11
- PostgreSQL accesible (local o Neon)

## Puesta en marcha

```bash
npm install
Copy-Item .env.example .env   # bash: cp .env.example .env
npm run start:dev
```

Editá el `.env` con los datos de tu base antes de arrancar. Si falta una variable obligatoria o tiene un valor inválido, el proceso **no arranca** y muestra el detalle (validación en `src/config/env.validation.ts`).

El servidor queda disponible en `http://localhost:3000` y el health check responde en `GET /`:

```json
{
  "status": "ok",
  "service": "backend-nest",
  "version": "0.0.1",
  "timestamp": "2026-10-19T23:00:00.000Z",
  "uptime": 12
}
```

El health check no consulta la base: la conexión se valida al arrancar y `GET /` no depende de PostgreSQL para responder.

## Variables de entorno

La configuración es global y se lee con `@nestjs/config`. La fuente de verdad del esquema es `src/config/env.validation.ts`; los valores por defecto y la resolución de aliases viven en `src/config/env.helpers.ts`.

| Variable                      | Obligatoria | Default       | Descripción                                                             |
| ----------------------------- | ----------- | ------------- | ----------------------------------------------------------------------- |
| `NODE_ENV`                    | No          | `development` | `development`, `test` o `production`.                                   |
| `ENVIRONMENT`                 | No          | —             | Alias legacy del backend Python. `NODE_ENV` tiene prioridad.            |
| `PORT`                        | No          | `3000`        | Puerto HTTP.                                                            |
| `DATABASE_URL`                | Sí\*        | —             | URL completa de PostgreSQL. Tiene prioridad sobre las `DB_*`.           |
| `DB_HOST`                     | Sí\*        | —             | Host local cuando no se usa `DATABASE_URL`.                             |
| `DB_PORT`                     | No          | `5432`        | Puerto de PostgreSQL.                                                   |
| `DB_USERNAME`                 | Sí\*        | —             | Usuario.                                                                |
| `DB_PASSWORD`                 | No          | vacío         | Password (puede quedar vacío en un PostgreSQL local con `trust`).       |
| `DB_NAME`                     | Sí\*        | —             | Nombre de la base.                                                      |
| `DB_SSL`                      | No          | auto          | `true` fuerza TLS. Si la URL trae `sslmode`, decide `pg`.               |
| `DB_POOL_MAX`                 | No          | `10`          | Conexiones máximas del pool.                                            |
| `DB_IDLE_TIMEOUT_MS`          | No          | `240000`      | Descarta clientes ociosos antes del autosuspend de Neon (5 min).        |
| `DB_CONNECT_TIMEOUT_MS`       | No          | `10000`       | Timeout de conexión.                                                    |
| `DB_SYNCHRONIZE`              | No          | auto          | `true`/`false`. Si se omite: solo en `development` y contra host local. |
| `DB_LOGGING`                  | No          | `false`       | `true` loguea queries; por defecto solo errores (CFB-145).              |
| `DB_MIGRATIONS_RUN`           | No          | `false`       | Corre migraciones al arrancar. Preferir el CLI en el deploy.            |
| `SECRET_KEY`                  | Sí          | —             | Firma de JWT, mínimo 16 caracteres.                                     |
| `ALGORITHM`                   | No          | `HS256`       | `HS256`, `HS384` o `HS512`.                                             |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No          | `480`         | Vigencia del access token (D-08 del contrato).                          |
| `CORS_ORIGINS`                | No          | vacío         | Orígenes separados por coma. MIG-20 los consume.                        |

\* Definí `DATABASE_URL` **o** `DB_HOST` + `DB_USERNAME` + `DB_NAME`.

Los valores de ejemplo de autenticación (`SECRET_KEY=dev-only-secret-...`) son solo para desarrollo: la validación los rechaza con `NODE_ENV=production`.

### Configuración tipada

- `appConfig` → `environment`, `isProduction`, `port`, `corsOrigins`.
- `authConfig` → `secretKey`, `algorithm`, `accessTokenExpiresInMinutes` (lo consumen MIG-23 y MIG-25).
- `databaseConfig` → `url`, `ssl`, `synchronize`, `logQueries`, `migrationsRun`, `pool`.

Se inyectan por token (`@Inject(databaseConfig.KEY)`) o se leen con `ConfigService.get('database.pool.max')`.

## Base de datos

La base de **Neon es compartida con producción y tiene datos reales**. La regla es simple: el esquema no se modifica solo, salvo en desarrollo local.

### Desarrollo local

Creá la base una vez (TypeORM crea las tablas, no la base):

```bash
createdb -h localhost -U postgres cafecito
```

Con `DB_HOST=localhost` y `NODE_ENV=development`, TypeORM arranca con `synchronize: true` y crea las tablas de las entities registradas con `TypeOrmModule.forFeature()`.

Si el `.env` de desarrollo apunta a Neon, `synchronize` queda **desactivado** automáticamente (el host no es local). Para habilitarlo igual hace falta `DB_SYNCHRONIZE=true`, algo que no deberías hacer: TypeORM podría alterar o borrar columnas de la base compartida.

### Neon y conexiones ociosas

Neon suspende la base tras 5 minutos sin uso y cierra las conexiones abiertas. Este backend replica el `pool_pre_ping` del legacy así:

- `extra.idleTimeoutMillis` (4 min por defecto) descarta los clientes antes de que Neon los cierre.
- `extra.keepAlive` mantiene vivo el TCP mientras la conexión esté en uso.
- `poolErrorHandler` registra el error del pool y **no deja que tumbe el proceso**.
- `poolSize` y `connectTimeoutMS` acotan recursos y tiempos de espera.

Con eso, la primera request después de un rato de inactividad abre una conexión nueva en lugar de reusar una cerrada.

### Migraciones (preprod y producción)

`synchronize` **nunca** está activo en producción. Los cambios de esquema se versionan como migraciones:

```bash
# Generar (compara las entities compiladas contra la base configurada)
npm run migration:generate -- src/database/migrations/Nombre -d dist/database/data-source.js

# Aplicar / revertir / listar
npm run migration:run
npm run migration:revert
npm run migration:show

# Ver el SQL que TypeORM propone (sin ejecutarlo)
npm run schema:log
```

El CLI corre sobre `dist/` porque TypeORM necesita los decoradores compilados; por eso los scripts hacen `npm run build` antes. El `DataSource` del CLI está en `src/database/data-source.ts` y carga `.env` automáticamente si existe.

En el deploy, lo ideal es `npm run migration:run` como paso previo a levantar la nueva versión (o `DB_MIGRATIONS_RUN=true` si el proveedor no permite un paso aparte).

## Tests

```bash
npm test          # unitarios (Vitest)
npm run test:e2e  # contrato HTTP, sin base de datos
```

Los e2e no requieren PostgreSQL: `test/setup-env.ts` inyecta variables descartables y el health check se prueba sin `DatabaseModule`. Para correr el smoke test real contra una base (nunca la de producción):

```bash
# bash
E2E_DATABASE=true DATABASE_URL="postgresql://..." npm run test:e2e

# PowerShell
$env:E2E_DATABASE='true'; $env:DATABASE_URL='postgresql://...'; npm run test:e2e
```

## Documentación de API

- [`docs/api-contract.md`](docs/api-contract.md) — contrato de API (MIG-17): decisiones de diseño, inventario de los 32 endpoints + health check y matriz de compatibilidad con el frontend.
- [`docs/openapi.yaml`](docs/openapi.yaml) — especificación OpenAPI 3.1 del contrato.
- [`docs/conventions.md`](docs/conventions.md) — convenciones de código (MIG-18) y módulo de referencia `src/categorias` para el resto de los módulos.

## Harness de trabajo

Guía para trabajar en el repositorio sin contexto previo (humanos y agentes):

| Documento                                                 | Contenido                                                                       |
| --------------------------------------------------------- | ------------------------------------------------------------------------------- |
| [`AGENTS.md`](AGENTS.md)                                  | Punto de entrada: orden de lectura, comandos y reglas duras.                    |
| [`docs/harness.md`](docs/harness.md)                      | Explicación del esquema de trabajo: qué se aplicó y por qué.                    |
| [`docs/constitution.md`](docs/constitution.md)            | Principios no negociables y cómo enmendarlos.                                   |
| [`docs/architecture.md`](docs/architecture.md)            | Componentes, módulos, dependencias y flujo de una request.                      |
| [`docs/glossary.md`](docs/glossary.md)                    | Roles, enums, transiciones de estado y vocabulario.                             |
| [`docs/adr/`](docs/adr/README.md)                         | Decisiones de arquitectura (422, `{ detail }`, fechas, decimales, barra final). |
| [`docs/workflows/`](docs/workflows/definition-of-done.md) | Definition of Done y receta para crear módulos.                                 |
| [`.agents/agent.md`](.agents/agent.md)                    | Cómo opera un agente en este repositorio.                                       |
| [`.agents/memory.md`](.agents/memory.md)                  | Estado vivo del proyecto y próximo paso.                                        |

Cada módulo de `src/` lleva su propia documentación junto al código:

| Archivo        | Rol                                                                                      |
| -------------- | ---------------------------------------------------------------------------------------- |
| `AGENTS.md`    | Shim local (≤ 40 líneas): por dónde empezar, reglas no obvias y comando de verificación. |
| `README.md`    | Responsabilidad, capas, modelo y estado del módulo.                                      |
| `CONTRACT.md`  | Endpoints, shapes y errores que expone.                                                  |
| `DECISIONS.md` | Decisiones locales, motivos, riesgos y pendientes.                                       |

## Scripts

| Script                       | Descripción                                     |
| ---------------------------- | ----------------------------------------------- |
| `npm run start:dev`          | Servidor en modo watch                          |
| `npm run build`              | Compila a `dist/`                               |
| `npm run start:prod`         | Ejecuta el build                                |
| `npm run lint`               | ESLint                                          |
| `npm run lint:fix`           | ESLint con autocorrección                       |
| `npm run typecheck`          | TypeScript (`tsc --noEmit`)                     |
| `npm run format`             | Prettier (escribe)                              |
| `npm run format:check`       | Prettier (verifica)                             |
| `npm test`                   | Tests unitarios (Vitest)                        |
| `npm run test:e2e`           | Tests end-to-end                                |
| `npm run migration:create`   | Crea una migración vacía                        |
| `npm run migration:generate` | Genera una migración comparando entities y base |
| `npm run migration:run`      | Aplica migraciones pendientes                   |
| `npm run migration:revert`   | Revierte la última migración                    |
| `npm run migration:show`     | Lista migraciones y su estado                   |
| `npm run schema:log`         | Muestra el SQL que faltaría aplicar             |

## Estructura

```
src/
├── auth/            # Autenticación (MIG-22 a MIG-25)
├── users/           # Usuarios
├── empleados/       # Empleados
├── mesas/           # Mesas
├── categorias/      # Categorías (módulo de referencia, MIG-18)
├── productos/       # Productos
├── pedidos/         # Pedidos
├── pagos/           # Pagos
├── caja/            # Caja
├── dashboard/       # KPIs
├── reportes/        # Reportes de ventas
├── health/          # Health check (GET /)
├── common/          # Guards, pipes, filters, interceptors, decorators
├── config/          # Validación del entorno + configuración tipada
├── database/        # DataSource, opciones de TypeORM y migraciones
├── app.module.ts
└── main.ts
```

## Convenciones

- Arquitectura **feature-based**: cada módulo agrupa controller, service, entity y DTOs.
- Imports internos con extensión `.js` (requerido por ESM + `nodenext`).
- TypeScript estricto: `strict`, `noUnusedLocals`, `noUnusedParameters`.
- Formato al guardar con Prettier y autocorrección de ESLint (`.vscode/settings.json`).
- Las entities mapean 1 a 1 las tablas existentes: `@Entity('<tabla>')`, columnas `snake_case` y restricciones con el nombre real de PostgreSQL.

## Estado de la migración

Sprint **S0 — Bootcamp**. La conexión a base de datos y la validación del entorno quedaron resueltas en MIG-19; CORS, validación global, autenticación y módulos de negocio se implementan en los tickets siguientes (MIG-20 a MIG-44).
