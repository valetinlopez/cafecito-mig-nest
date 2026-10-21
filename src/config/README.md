# Módulo `config`

| Campo       | Valor                                                                       |
| ----------- | --------------------------------------------------------------------------- |
| Estado      | **Implementado**                                                            |
| Ticket      | MIG-19 — configuración tipada + validación de entorno                       |
| Responsable | Validación de variables y configuración por namespace                       |
| Tests       | `app.config.spec.ts` · `database.config.spec.ts` · `env.validation.spec.ts` |

---

## 1. Responsabilidad

Centralizar la lectura, validación y tipado de la configuración. La app **no
arranca** si falta una variable obligatoria o tiene un valor inválido.

No expone endpoints: es infraestructura consumida por `AppModule`, `DatabaseModule`
y los módulos de auth.

---

## 2. Estructura

```
src/config/
├── app.config.ts            # namespace 'app'
├── auth.config.ts           # namespace 'auth'
├── database.config.ts       # namespace 'database'
├── env.helpers.ts           # lectura y parseo de variables
├── env.validation.ts        # esquema de validación de arranque
├── *.spec.ts                # tests de resolución y defaults
├── README.md
├── CONTRACT.md
└── DECISIONS.md
```

---

## 3. Namespaces

| Namespace  | Token                | Campos                                                             |
| ---------- | -------------------- | ------------------------------------------------------------------ |
| `app`      | `appConfig.KEY`      | `environment`, `isProduction`, `port`, `corsOrigins`               |
| `auth`     | `authConfig.KEY`     | `secretKey`, `algorithm`, `accessTokenExpiresInMinutes`            |
| `database` | `databaseConfig.KEY` | `url`, `ssl`, `synchronize`, `logQueries`, `migrationsRun`, `pool` |

Consumo:

```ts
// Tipado, recomendado
constructor(@Inject(databaseConfig.KEY) private readonly db: ConfigType<typeof databaseConfig>) {}

// Por ruta
configService.get<number>('database.pool.max');
```

---

## 4. Registro

En `src/app.module.ts`:

```ts
ConfigModule.forRoot({
  isGlobal: true,
  cache: true,
  envFilePath: ['.env.local', '.env'],
  ignoreEnvFile: process.env.NODE_ENV === 'production',
  load: [appConfig, authConfig, databaseConfig],
  validate: validateEnvironment,
});
```

---

## 5. Prioridades y aliases

| Caso            | Regla                                                          |
| --------------- | -------------------------------------------------------------- |
| URL de base     | `DATABASE_URL` gana sobre `DB_HOST/USERNAME/NAME/...`          |
| Entorno         | `NODE_ENV` gana sobre `ENVIRONMENT` (alias legacy)             |
| `synchronize`   | `DB_SYNCHRONIZE` explícito gana; si no, dev + host local       |
| `ssl`           | `DB_SSL` explícito gana; si la URL trae `sslmode`, decide `pg` |
| Archivos `.env` | `.env.local` gana sobre `.env`; en producción se ignoran       |

Detalle completo de variables: [`CONTRACT.md`](./CONTRACT.md) y `README.md` raíz.

---

## 6. Validación

`validateEnvironment` corre al arrancar y falla con un error legible si:

- Falta `SECRET_KEY` o tiene menos de 16 caracteres.
- No hay `DATABASE_URL` ni el trío `DB_HOST` + `DB_USERNAME` + `DB_NAME`.
- `ALGORITHM` no es `HS256`/`HS384`/`HS512`.
- Un número (`PORT`, `DB_PORT`, `DB_POOL_MAX`, ...) no es válido.
- `NODE_ENV` no es `development`/`test`/`production`.
- En producción se usa el secreto de ejemplo de desarrollo.

---

## 7. Tests

| Archivo                   | Cubre                                           |
| ------------------------- | ----------------------------------------------- |
| `env.validation.spec.ts`  | Obligatorios, rangos, secretos y combinaciones. |
| `app.config.spec.ts`      | Defaults, `NODE_ENV` vs `ENVIRONMENT`, CORS.    |
| `database.config.spec.ts` | URL vs `DB_*`, SSL, `synchronize`, pool.        |

---

## 8. Referencias

- [`CONTRACT.md`](./CONTRACT.md) · [`DECISIONS.md`](./DECISIONS.md)
- `README.md` raíz — tabla de variables de entorno
