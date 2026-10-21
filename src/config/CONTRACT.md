# Contrato — `config`

> Módulo de infraestructura: **no expone HTTP**. Este documento fija el contrato
> interno que consumen los demás módulos.

---

## 1. Variables de entorno aceptadas

| Variable                      | Obligatoria | Default       | Tipo / valores                    |
| ----------------------------- | ----------- | ------------- | --------------------------------- |
| `NODE_ENV`                    | No          | `development` | `development`/`test`/`production` |
| `ENVIRONMENT`                 | No          | —             | alias legacy de `NODE_ENV`        |
| `PORT`                        | No          | `3000`        | entero                            |
| `DATABASE_URL`                | Sí\*        | —             | URL PostgreSQL                    |
| `DB_HOST`                     | Sí\*        | —             | string                            |
| `DB_PORT`                     | No          | `5432`        | entero                            |
| `DB_USERNAME`                 | Sí\*        | —             | string                            |
| `DB_PASSWORD`                 | No          | `''`          | string                            |
| `DB_NAME`                     | Sí\*        | —             | string                            |
| `DB_SSL`                      | No          | auto          | `true`/`false`                    |
| `DB_POOL_MAX`                 | No          | `10`          | entero                            |
| `DB_IDLE_TIMEOUT_MS`          | No          | `240000`      | entero (ms)                       |
| `DB_CONNECT_TIMEOUT_MS`       | No          | `10000`       | entero (ms)                       |
| `DB_SYNCHRONIZE`              | No          | auto          | `true`/`false`                    |
| `DB_LOGGING`                  | No          | `false`       | `true`/`false`                    |
| `DB_MIGRATIONS_RUN`           | No          | `false`       | `true`/`false`                    |
| `SECRET_KEY`                  | Sí          | —             | string, mínimo 16                 |
| `ALGORITHM`                   | No          | `HS256`       | `HS256`/`HS384`/`HS512`           |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No          | `480`         | entero                            |
| `CORS_ORIGINS`                | No          | `''`          | lista separada por coma           |

\* `DATABASE_URL` **o** `DB_HOST` + `DB_USERNAME` + `DB_NAME`.

---

## 2. Contrato de cada namespace

### `app`

```ts
interface AppConfig {
  environment: 'development' | 'test' | 'production';
  isProduction: boolean;
  port: number;
  corsOrigins: string[]; // normalizados, sin barra final
}
```

### `auth`

```ts
interface AuthConfig {
  secretKey: string;
  algorithm: 'HS256' | 'HS384' | 'HS512';
  accessTokenExpiresInMinutes: number;
}
```

### `database`

```ts
interface DatabaseConfig {
  url?: string;
  ssl?: boolean; // undefined = decide pg según la URL
  synchronize: boolean;
  logQueries: boolean;
  migrationsRun: boolean;
  pool: {
    max: number;
    idleTimeoutMillis: number;
    connectionTimeoutMillis: number;
  };
}
```

---

## 3. Garantías

| Garantía                                       | Verificación               |
| ---------------------------------------------- | -------------------------- |
| Si falta un obligatorio, el proceso no arranca | `validateEnvironment`      |
| En producción no se leen archivos `.env`       | `ignoreEnvFile`            |
| En producción se rechaza el secreto de ejemplo | `env.validation.ts`        |
| `synchronize` nunca es `true` en producción    | `database.config.ts`       |
| Los orígenes CORS vienen sin barra final       | `readList` + normalización |

---

## 4. Errores de configuración

No hay respuesta HTTP: el error se emite al arrancar, con el nombre de la
variable y el motivo. Un `.env` inválido es un fallo de despliegue, no de
runtime.
