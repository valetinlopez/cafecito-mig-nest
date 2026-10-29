# Arquitectura — Cafecitoapp Backend NestJS

| Campo           | Valor                                                                         |
| --------------- | ----------------------------------------------------------------------------- |
| Versión         | `1.0.0`                                                                       |
| Última revisión | 2026-10-20 · Sprint S0                                                        |
| Documentos base | [`api-contract.md`](./api-contract.md) · [`conventions.md`](./conventions.md) |
| Decisiones      | [`adr/`](./adr/)                                                              |

Este documento responde **qué componentes existen, cómo se comunican y dónde
vive cada responsabilidad**. El detalle de código está en
[`conventions.md`](./conventions.md); el detalle funcional, en el contrato.

---

## 1. Contexto

Cafecitoapp es un sistema de gestión gastronómica (mesas, pedidos, caja y
reportes). El backend actual está en **FastAPI (Python)** y se está migrando a
**NestJS (TypeScript)** sin cambiar el contrato que consume el frontend.

```
┌──────────────┐        HTTP/JSON        ┌───────────────────┐
│  Frontend    │ ──────────────────────► │  Backend NestJS   │
│  (Next.js)   │ ◄────────────────────── │  /api/v1          │
└──────────────┘                         └─────────┬─────────┘
                                                   │ TypeORM / pg
                                         ┌─────────▼─────────┐
                                         │  PostgreSQL (Neon)│
                                         │  base compartida  │
                                         └───────────────────┘

┌───────────────────────┐
│  Backend FastAPI      │  legacy, operativo hasta el cutover (MIG-42)
└───────────────────────┘
```

**Restricción central:** ambos backends comparten el esquema. Las entities de
NestJS mapean las tablas existentes; el esquema no se rediseña en la migración.

---

## 2. Stack y versiones

| Capa          | Tecnología                                     |
| ------------- | ---------------------------------------------- |
| Runtime       | Node.js >= 24, ESM                             |
| Framework     | NestJS 12 sobre Express                        |
| Lenguaje      | TypeScript 6 (`module: nodenext`, `strict`)    |
| ORM           | TypeORM 1 + driver `pg`                        |
| Base de datos | PostgreSQL (Neon en preprod/producción)        |
| Validación    | `class-validator` / `class-transformer`        |
| Auth          | `@nestjs/passport` + `passport-jwt` + `bcrypt` |
| Documentación | `@nestjs/swagger` (OpenAPI 3.1)                |
| Tests         | Vitest + `@nestjs/testing` + Supertest         |
| Calidad       | ESLint 10 + Prettier 3                         |

---

## 3. Estilo arquitectónico

**Monolito modular feature-based.** Un directorio por recurso de dominio, cada
uno con su controller, service, DTOs y entities. Sin capas globales de
`repositories/` ni `usecases/`: la profundidad se resuelve dentro del módulo.

```
src/
├── <recurso>/                 # feature module
│   ├── <recurso>.module.ts
│   ├── <recurso>.controller.ts
│   ├── <recurso>.service.ts
│   ├── <recurso>.service.spec.ts
│   ├── dto/
│   ├── entities/
│   ├── AGENTS.md              # shim local (auto-load, ≤ 30 líneas)
│   ├── README.md              # doc del módulo (harness)
│   ├── CONTRACT.md
│   └── DECISIONS.md
├── common/                    # piezas transversales
├── config/                    # configuración tipada + validación de entorno
├── database/                  # DataSource, opciones TypeORM, migraciones
├── app.module.ts
└── main.ts
```

**Por qué feature-based:** el equipo es de 3 devs, cada ticket toca un dominio y
el módulo de referencia (`src/categorias`) ya fija el patrón. Una arquitectura
por capas obligaría a saltar entre cuatro carpetas para un solo cambio.

---

## 4. Flujo de una request

```
HTTP
 │
 ├─ main.ts ............ bootstrap, ConfigService, configureApp (prefijo + CORS)
 │
 ├─ CommonModule ....... ValidationPipe (422), AllExceptionsFilter, ResponseTime
 │
 ├─ Controller ......... valida entrada (DTO), delega, elige código HTTP
 │
 ├─ Guard .............. JwtAuthGuard → RolesGuard (por controller)
 │
 ├─ Service ............ reglas de negocio + transacciones
 │
 ├─ Repository ......... TypeORM (`@InjectRepository`)
 │
 ├─ Entity ............. mapeo a tabla
 │
 └─ Response DTO ....... `fromEntity()`, shape exacto del contrato
```

Puntos de borde:

- **Errores:** `AllExceptionsFilter` global transforma toda excepción en
  `{ detail }` (ADR 0002), registrado en `CommonModule`.
- **Validación:** `AppValidationPipe` global responde `422` con el mensaje en
  español (ADR 0001).
- **Serialización:** no hay interceptor global; los DTOs controlan el shape.
- **Prefijo:** `/api/v1` con exclusión de `/` para el health, en `app.setup.ts`.
- **CORS:** orígenes de `CORS_ORIGINS`; fuera del prefijo, un fallback JSON
  reemplaza el 404 HTML de Express.

> Estado real: `src/main.ts` crea la app, lee la config y delega el cableado HTTP
> en `src/app.setup.ts`. Las piezas transversales viven en `src/common` y se
> registran con `CommonModule` (MIG-20).

---

## 5. Mapa de módulos

| Módulo     | Directorio       | Estado                       | Dominio                                | Depende de                                     |
| ---------- | ---------------- | ---------------------------- | -------------------------------------- | ---------------------------------------------- |
| Health     | `src/health`     | **Implementado**             | `GET /` (fuera de `/api/v1`)           | —                                              |
| Config     | `src/config`     | **Implementado**             | Validación de entorno + config tipada  | —                                              |
| Database   | `src/database`   | **Implementado**             | DataSource, pool, migraciones          | `config`                                       |
| Categorías | `src/categorias` | **Implementado (lectura + JWT)** | `GET /categorias/`                | `database`, `common`                           |
| Auth       | `src/auth`       | **Implementado** (MIG-23)    | Login, registro, perfil, password      | `users`, `config/auth`, `common`               |
| Users      | `src/users`      | **Implementado** (MIG-22/25) | Entity/gestión de usuarios             | `database`                                     |
| Empleados  | `src/empleados`  | Implementado en rama MIG-26 (pendiente revisión) | ABM de empleados (`rol = mozo`) | `users`, `common`                               |
| Mesas      | `src/mesas`      | Implementado (MIG-27)        | Estados y ABM de mesas                 | `ACTIVE_ORDERS_PORT` (adapter de pedidos pendiente MIG-30) |
| Productos  | `src/productos`  | Parcial (MIG-29: GET/POST/PATCH; DELETE MIG-30) | Catálogo, stock, precios | `categorias` (lookup); schema/transformer MIG-44 |
| Pedidos    | `src/pedidos`    | Scaffold (módulo vacío)      | Comandas y transiciones                | `mesas`, `productos`, `users`, `caja`, `pagos` |
| Pagos      | `src/pagos`      | Entity + DTOs (MIG-31); cobro MIG-32 | Persistencia de cobros (sin endpoints) | `pedidos`, `caja`, `users`                     |
| Caja       | `src/caja`       | Scaffold (módulo vacío)      | Apertura, cierre, movimientos          | `pagos`                                        |
| Dashboard  | `src/dashboard`  | Scaffold (módulo vacío)      | KPIs de solo lectura                   | `mesas`, `pedidos`, `pagos`, `caja`            |
| Reportes   | `src/reportes`   | Scaffold (módulo vacío)      | Reporte de ventas por período          | `pagos`, `caja`, `pedidos`                     |
| Common     | `src/common`     | **Implementado**             | Filtros, pipes, guards, decoradores    | —                                              |

**Leyenda:** _Implementado_ = código + tests + doc. _Scaffold_ = el módulo
existe registrado en `AppModule` pero sin controller/service/entity; su contrato
está definido y su implementación es un ticket pendiente.

Cada módulo documenta su detalle en `src/<modulo>/README.md`.

---

## 6. Dependencias entre módulos

```
                         ┌──────────┐
                         │  config  │
                         └────┬─────┘
                              │
                         ┌────▼─────┐
                         │ database │
                         └────┬─────┘
        ┌──────────┬──────────┼───────────┬───────────┐
        │          │          │           │           │
   ┌────▼───┐ ┌────▼────┐ ┌───▼────┐ ┌────▼────┐ ┌────▼────┐
   │ users  │ │categorias│ │ mesas  │ │  caja   │ │ health  │
   └────┬───┘ └────┬────┘ └───┬────┘ └────┬────┘ └─────────┘
        │          │          │           │
   ┌────▼────┐ ┌───▼─────┐    │      ┌────▼────┐
   │empleados│ │productos│    │      │  pagos  │
   └─────────┘ └───┬─────┘    │      └────┬────┘
                   │          │           │
                   └──────────┼───────────┘
                              │
                        ┌─────▼─────┐
                        │  pedidos  │
                        └─────┬─────┘
              ┌───────────────┼───────────────┐
        ┌─────▼─────┐   ┌─────▼─────┐   ┌─────▼─────┐
        │ dashboard │   │ reportes  │   │   auth    │
        └───────────┘   └───────────┘   └───────────┘
```

Reglas de dependencia:

1. `common`, `config` y `database` no dependen de ningún feature module.
2. Un feature module **no importa otro feature module** salvo por su service
   exportado, y solo cuando hay una regla de negocio compartida (ej.
   `ProductosService` para validar stock).
3. Las dependencias circulares se resuelven **moviendo la regla al módulo
   dueño**, nunca con `forwardRef`.
4. Las relaciones de TypeORM se declaran cuando existen **ambas** entities.

---

## 7. Modelo de datos (estado conocido)

Solo `categorias` y `usuarios` tienen entity implementada. El resto se infiere
del contrato y del legacy, y debe validarse contra la base en MIG-44 antes de
considerar definitivo su mapeo. Productos ya tiene entity provisional en esta
rama; sus columnas y relaciones siguen sujetas a esa validación.

| Tabla legacy (a confirmar) | Entity           | Módulo     | Estado                |
| -------------------------- | ---------------- | ---------- | --------------------- |
| `categorias`               | `Categoria`      | categorias | Implementada          |
| `usuarios`                 | `Usuario`        | users      | Implementada (MIG-22) |
| `mesas`                    | `Mesa`           | mesas      | Pendiente             |
| `productos`                | `Producto`       | productos  | Provisional (MIG-29; validar MIG-44) |
| `pedidos`                  | `Pedido`         | pedidos    | Pendiente             |
| `detalle_pedidos`          | `DetallePedido`  | pedidos    | Pendiente             |
| `pagos`                    | `Pago`           | pagos      | Provisional (MIG-31; validar MIG-44) |
| `cajas`                    | `Caja`           | caja       | Pendiente             |
| `movimientos_caja`*        | `MovimientoCaja` | caja       | Pendiente             |

\* El contrato expone movimientos derivados de pagos; la tabla real se confirma
en MIG-44.

Reglas transversales de persistencia:

- `@Entity('<tabla>')` explícito y `snake_case`.
- Restricciones (`@Unique`, `@Index`) con el nombre real de PostgreSQL.
- `numeric` → transformer a `number` (ADR 0004).
- Fechas `timestamp without time zone` → `utcTimestampTransformer` + proceso en UTC; ISO-8601 con `Z` en el DTO (ADR 0003, ADR 0007).
- Sin `eager: true`; las relaciones se piden explícitamente.

---

## 8. Configuración y entornos

`ConfigModule.forRoot()` es global y valida el entorno al arrancar
(`src/config/env.validation.ts`). Si falta una variable obligatoria o es
inválida, el proceso no levanta.

| Config     | Archivo                     | Consume                                  |
| ---------- | --------------------------- | ---------------------------------------- |
| `app`      | `config/app.config.ts`      | `environment`, `port`, `corsOrigins`     |
| `auth`     | `config/auth.config.ts`     | `secretKey`, `algorithm`, expiración JWT |
| `database` | `config/database.config.ts` | `url`, `ssl`, `synchronize`, pool        |

Prioridades: `DATABASE_URL` gana sobre las `DB_*`; `NODE_ENV` gana sobre
`ENVIRONMENT` (alias legacy); `DB_SYNCHRONIZE` explícito gana sobre el default.

**Regla de esquema:** `synchronize` solo es `true` en desarrollo **y** con host
local. Contra Neon (aunque sea un `.env` de desarrollo), queda en `false`.

---

## 9. Piezas transversales (estado y destino)

| Pieza                            | Estado           | Destino | Doc                    |
| -------------------------------- | ---------------- | ------- | ---------------------- |
| Prefijo global `/api/v1`         | **Implementado** | MIG-20  | Contrato D-01          |
| `ValidationPipe` 422             | **Implementado** | MIG-20  | ADR 0001               |
| `AllExceptionsFilter` `{detail}` | **Implementado** | MIG-20  | ADR 0002               |
| CORS configurable                | **Implementado** | MIG-20  | Contrato D-16          |
| `numericTransformer`             | **Implementado** | MIG-31  | ADR 0004               |
| Serialización de fechas `Z`      | **Implementado** | MIG-43  | ADR 0003 + 0007        |
| `JwtAuthGuard` + `RolesGuard`    | **Implementado** | MIG-23  | Contrato §4            |
| Swagger en `/docs`               | Pendiente        | MIG-40  | Convenciones §9        |
| Header `X-Response-Time-ms`      | **Implementado** | MIG-20  | Contrato D-11          |
| Utilidades de test compartidas   | **Implementado** | MIG-21  | test/README + ADR 0006 |

---

## 10. Tests y verificación

| Nivel    | Ubicación                   | Alcance                                         |
| -------- | --------------------------- | ----------------------------------------------- |
| Unitario | `src/<modulo>/*.spec.ts`    | Services con repositorio mockeado. Sin DB.      |
| Config   | `src/config/*.spec.ts`      | Resolución de entorno y defaults.               |
| e2e      | `test/*.e2e-spec.ts`        | Contrato HTTP, sin PostgreSQL por defecto.      |
| Smoke DB | `test/database.e2e-spec.ts` | Solo con `E2E_DATABASE=true`.                   |
| Helpers  | `test/utils/*.ts`           | Mocks tipados de `Repository` y `QueryBuilder`. |

Los unitarios usan los helpers de `test/utils/` y se documentan en
[`test/README.md`](../test/README.md). La cobertura se ejecuta con
`npm run test:cov` (Vitest + V8, ADR 0006). Los e2e no levantan base:
`test/setup-env.ts` inyecta variables descartables.
El detalle de criterios está en
[`workflows/definition-of-done.md`](./workflows/definition-of-done.md).

---

## 11. Seguridad

- JWT Bearer HS256, 480 min, roles `admin`/`mozo` (D-08).
- El access token solo lleva `{ sub, rol }`; `JwtStrategy` relee el usuario y
  rechaza tokens de reseteo (`purpose`) y usuarios inactivos.
- Password con `bcrypt`; el hash nunca sale en un DTO.
- Guards por controller con `@Public()` explícito; `@CurrentUser()` falla
  cerrado si falta el guard.
- Toda respuesta no-2xx usa `{ detail }` sin filtrar stack traces ni detalles
  internos.
- Los secretos vienen del entorno; el arranque falla si faltan.
- CORS con lista explícita de orígenes (nunca `*` con credenciales).

---

## 12. Límites y decisiones abiertas

| Tema                              | Estado                          | Referencia      |
| --------------------------------- | ------------------------------- | --------------- |
| Paginación                        | Fuera de alcance en S0 (D-10)   | Contrato D-10   |
| Envelope de éxito                 | No se usa; arrays planos        | Contrato D-10   |
| Rediseño de paths                 | Prohibido en la migración       | Constitución §2 |
| Nombres de tablas reales          | A confirmar contra la base      | MIG-44          |
| Estrategia de refresh token       | No definida (solo access token) | Pendiente       |
| Observabilidad (métricas/tracing) | No definida en S0               | Pendiente       |

### Índice de ADRs

| ID   | Título                                 | Estado   |
| ---- | -------------------------------------- | -------- |
| 0001 | Validación de DTO con `422`            | Aceptado |
| 0002 | Envelope de error `{ detail }`         | Aceptado |
| 0003 | Fechas ISO-8601 UTC con `Z`            | Aceptado |
| 0004 | Decimales como `number` en JSON        | Aceptado |
| 0005 | Barra final equivalente en colecciones | Aceptado |
| 0006 | Vitest como runner único de tests      | Aceptado |
| 0007 | Zona horaria del proceso y `timestamp` | Aceptado |

---

_Documento vivo: se actualiza en el mismo PR que cambia la arquitectura._
