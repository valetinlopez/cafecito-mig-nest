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

La documentación interactiva de la API está en `http://localhost:3000/docs`
(ver [Documentación interactiva](#documentación-interactiva-swagger)).

El health check no consulta la base: la conexión se valida al arrancar y `GET /` no depende de PostgreSQL para responder.

## Variables de entorno

La configuración es global y se lee con `@nestjs/config`. La fuente de verdad del esquema es `src/config/env.validation.ts`; los valores por defecto y la resolución de aliases viven en `src/config/env.helpers.ts`.

| Variable                      | Obligatoria | Default                 | Descripción                                                             |
| ----------------------------- | ----------- | ----------------------- | ----------------------------------------------------------------------- |
| `NODE_ENV`                    | No          | `development`           | `development`, `test` o `production`.                                   |
| `ENVIRONMENT`                 | No          | —                       | Alias legacy del backend Python. `NODE_ENV` tiene prioridad.            |
| `PORT`                        | No          | `3000`                  | Puerto HTTP.                                                            |
| `DATABASE_URL`                | Sí\*        | —                       | URL completa de PostgreSQL. Tiene prioridad sobre las `DB_*`.           |
| `DB_HOST`                     | Sí\*        | —                       | Host local cuando no se usa `DATABASE_URL`.                             |
| `DB_PORT`                     | No          | `5432`                  | Puerto de PostgreSQL.                                                   |
| `DB_USERNAME`                 | Sí\*        | —                       | Usuario.                                                                |
| `DB_PASSWORD`                 | No          | vacío                   | Password (puede quedar vacío en un PostgreSQL local con `trust`).       |
| `DB_NAME`                     | Sí\*        | —                       | Nombre de la base.                                                      |
| `DB_SSL`                      | No          | auto                    | `true` fuerza TLS. Si la URL trae `sslmode`, decide `pg`.               |
| `DB_POOL_MAX`                 | No          | `10`                    | Conexiones máximas del pool.                                            |
| `DB_IDLE_TIMEOUT_MS`          | No          | `240000`                | Descarta clientes ociosos antes del autosuspend de Neon (5 min).        |
| `DB_CONNECT_TIMEOUT_MS`       | No          | `10000`                 | Timeout de conexión.                                                    |
| `DB_SYNCHRONIZE`              | No          | auto                    | `true`/`false`. Si se omite: solo en `development` y contra host local. |
| `DB_LOGGING`                  | No          | `false`                 | `true` loguea queries; por defecto solo errores (CFB-145).              |
| `DB_MIGRATIONS_RUN`           | No          | `false`                 | Corre migraciones al arrancar. Preferir el CLI en el deploy.            |
| `SECRET_KEY`                  | Sí          | —                       | Firma de JWT, mínimo 16 caracteres.                                     |
| `ALGORITHM`                   | No          | `HS256`                 | `HS256`, `HS384` o `HS512`.                                             |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No          | `480`                   | Vigencia del access token (D-08 del contrato).                          |
| `CORS_ORIGINS`                | No          | `http://localhost:3000` | Orígenes permitidos por CORS, separados por coma. MIG-20.               |

\* Definí `DATABASE_URL` **o** `DB_HOST` + `DB_USERNAME` + `DB_NAME`.

Los valores de ejemplo de autenticación (`SECRET_KEY=dev-only-secret-...`) son solo para desarrollo: la validación los rechaza con `NODE_ENV=production`.

**Zona horaria:** el proceso se fija en **UTC** al arrancar
(`pinProcessTimezone()`, [ADR 0007](docs/adr/0007-zona-horaria-proceso.md)). No
hace falta definir `TZ`: si el entorno trae otra zona, el backend la reemplaza
y deja una advertencia en el log. Es obligatorio para interpretar las columnas
`timestamp without time zone` que comparte con el backend FastAPI.

### Configuración tipada

- `appConfig` → `environment`, `isProduction`, `port`, `corsOrigins`.
- `authConfig` → `secretKey`, `algorithm`, `accessTokenExpiresInMinutes` (lo consumen MIG-23 y MIG-25).
- `databaseConfig` → `url`, `ssl`, `synchronize`, `logQueries`, `migrationsRun`, `pool`.

Se inyectan por token (`@Inject(databaseConfig.KEY)`) o se leen con `ConfigService.get('database.pool.max')`.

## API HTTP transversal

Cableado definido en `src/app.setup.ts` y `src/common` (MIG-20):

- **Prefijo:** todos los recursos viven bajo `/api/v1`; el health queda en `GET /`.
- **Errores:** toda respuesta no-2xx usa el envelope `{ "detail": "..." }` (ADR 0002);
  los mensajes de negocio van en español.
- **Validación:** un DTO inválido responde `422` con `Campo 'x': mensaje` (ADR 0001).
- **Performance:** cada response lleva `X-Response-Time-ms` (D-11).
- **CORS:** solo los orígenes de `CORS_ORIGINS`, con credenciales. Sin la variable se
  usa `http://localhost:3000`; `*` se refleja con una advertencia en el log.
- **Fechas:** ISO-8601 UTC con `Z` (`2026-10-19T20:24:10.794Z`); el proceso corre
  en UTC y las columnas compartidas usan `utcTimestampTransformer` (ADR 0007).

```bash
curl -i http://localhost:3000/api/v1/categorias/
# X-Response-Time-ms: 3.42
```

## Documentación interactiva (Swagger)

La API se documenta desde los decoradores de `@nestjs/swagger` en controllers y
DTOs (MIG-40). El cableado vive en `src/common/http/swagger.setup.ts` y se
registra en `configureApp`, así que el arranque real y los e2e publican lo mismo.

| Recurso      | URL                                | Para qué                                            |
| ------------ | ---------------------------------- | --------------------------------------------------- |
| Swagger UI   | `http://localhost:3000/docs`       | Explorar y probar los 32 endpoints + health.         |
| OpenAPI JSON | `http://localhost:3000/docs-json`  | Consumir el documento desde herramientas o clientes. |

- La UI queda **fuera** de `/api/v1`, igual que el `/docs` de FastAPI, y está
  disponible también en producción: solo describe endpoints que ya existen.
- Para probar endpoints protegidos, usá **Authorize** con `Bearer <access_token>`
  (el token de `POST /api/v1/auth/login`). La UI conserva el token al recargar.
- Los tags siguen el orden del contrato: Auth, Mesas, Productos, Categorías,
  Pedidos, Caja, Dashboard, Empleados, Reportes y Health.
- `docs/openapi.yaml` (MIG-17) sigue siendo el contrato congelado; el documento
  de `/docs-json` es la vista viva generada desde el código. Si divergen, el
  contrato manda y se corrige el código.

## Guía de migración desde FastAPI

El objetivo de la migración es que el frontend **no cambie**: se preservan paths,
payloads en `snake_case`, códigos de estado, roles y el envelope de error. Lo que
cambia es la implementación y las herramientas. Esta tabla resume las
equivalencias y el porqué de cada decisión.

| Pieza                   | Backend FastAPI (legacy)                     | Backend NestJS (actual)                                              | Por qué                                                                 |
| ----------------------- | -------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Organización            | `APIRouter` por dominio                       | Feature module: controller, service, entity y DTOs                   | Misma separación por dominio; el controller solo traduce HTTP.          |
| Validación de entrada   | Pydantic (`422` con `loc`/`msg`)              | `class-validator` + `ValidationPipe` (`422` en español)              | El front ya espera `422`; el mensaje se traduce a `Campo 'x': ...` (ADR 0001). |
| Errores HTTP            | `HTTPException` y handlers                    | `AllExceptionsFilter` con `{ "detail": "..." }`                       | Un solo envelope para todo no-2xx (ADR 0002).                           |
| Persistencia            | SQLAlchemy sobre las tablas existentes        | TypeORM con entities `@Entity('<tabla>')` y `snake_case`             | Las entities siguen el esquema legacy, no al revés (ADR 0009).          |
| Esquema en desarrollo   | `create_all`                                  | `synchronize` solo local; contra Neon, migraciones                    | La base de Neon es compartida con producción: nunca se altera sola.     |
| Fechas                  | `datetime` del proceso                        | Proceso en UTC + transformer + `toIsoUtc()`                          | ISO-8601 con `Z` estable en todos los entornos (ADR 0003 y 0007).       |
| Decimales               | `Decimal` serializado                         | `numericTransformer` y DTO con `Number()`                            | El contrato exige números JSON, no strings (ADR 0004).                  |
| Barra final             | Redirect `307` de FastAPI                     | Acepta con y sin barra, sin redirect                                 | El front no debe seguir redirects ni perder el body (ADR 0005).         |
| Autenticación           | `python-jose` + `passlib` (bcrypt)            | `@nestjs/jwt` + Passport + `bcrypt`                                  | Claims `sub`/`rol` y hashes del legacy siguen siendo válidos (MIG-25).  |
| Tokens                  | Access token + reset token                    | Igual: HS256, 480 min; reset `purpose=password_reset`, 15 min         | El front y los usuarios existentes no se re-loguean ni re-resetean.     |
| Documentación           | `/docs` y `/openapi.json` automáticos         | Swagger UI en `/docs` y JSON en `/docs-json`                         | Equivalencia directa para el equipo y para el cutover.                  |
| Datos de desarrollo     | `seed.py`                                     | `npm run seed` idempotente y bloqueado en producción                 | Base reproducible sin riesgo para la base compartida (MIG-39).          |
| Health check            | `GET /` con el mismo shape                    | `GET /` con `status`, `service`, `version`, `timestamp`, `uptime`     | Monitoreo y deploy no cambian (D-14).                                   |
| CORS                    | `CORSMiddleware(allow_origins=...)`           | `CORS_ORIGINS` + credenciales                                        | Mismos orígenes permitidos, configurables por entorno.                  |
| Header de performance   | `X-Response-Time-ms`                          | Mismo header en cada response                                        | El front y los tableros no cambian (D-11).                              |
| Configuración           | `BaseSettings` (pydantic-settings)            | `@nestjs/config` + `env.validation.ts`                               | Falla al arrancar si falta una variable, en vez de fallar en runtime.   |
| Tests                   | `pytest` + `TestClient`                       | Vitest + Supertest (unitarios sin base y e2e de contrato)            | Mismo alcance, sin PostgreSQL en CI (ADR 0006).                         |

### Qué no cambió

- Los **32 endpoints** y el health, con el prefijo `/api/v1` (contrato §6).
- El JSON en `snake_case`, los enums y los códigos de estado.
- El envelope `{ "detail": "..." }`, el `422` de validación y los roles
  `admin`/`mozo`.
- La ausencia de paginación (D-10) y las reglas de negocio (caja, pedidos,
  stock, reportes).

### Qué tiene que saber quien integra

- Los **paths son los mismos**: si el front apunta al backend nuevo, no cambia
  URLs ni tipos (la matriz completa está en `docs/api-contract.md` §8).
- `GET /docs` reemplaza al `/docs` de FastAPI; `GET /docs-json`, al
  `/openapi.json`.
- Las fechas llegan con `Z` y los montos como números: mismo contrato, sin
  conversiones nuevas del lado del front.
- Cualquier diferencia se resuelve en el código, no cambiando el contrato
  (constitución §1). El detalle de cada decisión está en `docs/adr/`.

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

### Seed de desarrollo

```bash
npm run seed
```

Carga los mismos datos que `seed.py` del legacy: 2 usuarios, 4 categorías, 10 productos y 12 mesas. Es idempotente **por tabla** (si una tabla ya tiene filas, se omite) y corre en una transacción.

> **Producción:** el comando se bloquea con `NODE_ENV=production`. La base de Neon es compartida con el backend legacy; solo se habilita con `SEED_ALLOW_PRODUCTION=true` y confirmación humana. Detalle en [`src/database/README.md`](src/database/README.md) §5.1.

## Tests

```bash
npm test           # unitarios (Vitest)
npm run test:watch # unitarios en watch
npm run test:cov   # unitarios + cobertura
npm run test:e2e   # contrato HTTP, sin base de datos
```

Los unitarios mockean repositorios y QueryBuilder con los helpers de
`test/utils/` (ver [`test/README.md`](test/README.md)); no se conectan a
PostgreSQL. El runner único es Vitest ([ADR 0006](docs/adr/0006-vitest-runner-tests.md)).

Los e2e no requieren PostgreSQL: `test/setup-env.ts` inyecta variables descartables y el health check se prueba sin `DatabaseModule`. Para correr el smoke test real contra una base (nunca la de producción):

```bash
# bash
E2E_DATABASE=true DATABASE_URL="postgresql://..." npm run test:e2e

# PowerShell
$env:E2E_DATABASE='true'; $env:DATABASE_URL='postgresql://...'; npm run test:e2e
```

## Documentación de API

- [`GET /docs`](http://localhost:3000/docs) — Swagger UI interactiva generada
  desde los decoradores (MIG-40). Incluye Authorize con Bearer.
- [`GET /docs-json`](http://localhost:3000/docs-json) — documento OpenAPI 3.x
  en JSON.
- [`docs/api-contract.md`](docs/api-contract.md) — contrato de API (MIG-17): decisiones de diseño, inventario de los 32 endpoints + health check y matriz de compatibilidad con el frontend.
- [`docs/openapi.yaml`](docs/openapi.yaml) — especificación OpenAPI 3.1 del contrato, congelada como referencia de MIG-17.
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
| [`docs/workflows/sdd.md`](docs/workflows/sdd.md)          | Ciclo SDD (DevelopAI): spec, plan, tareas, validación y veredicto.              |
| [`specs/README.md`](specs/README.md)                      | Especificaciones por funcionalidad y su estado.                                 |
| [`.opencode/agents/`](.opencode/agents)                   | Roles con permisos: `coordinator`, `planner`, `implementer`, `reviewer`.        |
| [`.opencode/commands/`](.opencode/commands)               | Comandos `/sdd-*` del ciclo.                                                    |

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
| `npm run test:watch`         | Tests unitarios en watch                        |
| `npm run test:cov`           | Tests unitarios + cobertura                     |
| `npm run test:e2e`           | Tests end-to-end                                |
| `npm run migration:create`   | Crea una migración vacía                        |
| `npm run migration:generate` | Genera una migración comparando entities y base |
| `npm run migration:run`      | Aplica migraciones pendientes                   |
| `npm run migration:revert`   | Revierte la última migración                    |
| `npm run migration:show`     | Lista migraciones y su estado                   |
| `npm run schema:log`         | Muestra el SQL que faltaría aplicar             |
| `npm run seed`               | Carga los datos de desarrollo (idempotente)     |

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

Sprint **S5 — Cutover & Deploy**. Los 32 endpoints del contrato están
implementados y cubiertos por unitarios y e2e; el seed y la validación contra el
esquema real (MIG-39 y MIG-44) están implementados. La API se publica documentada
en `/docs` (MIG-40). Queda el cutover (MIG-42) y la revisión humana de los
veredictos SDD pendientes; el seguimiento vivo está en
[`.agents/memory.md`](.agents/memory.md).
