# Módulo `common`

| Campo         | Valor                                                        |
| ------------- | ------------------------------------------------------------ |
| Estado        | **Implementado** (MIG-20; guards y decoradores en MIG-23/24) |
| Tipo          | Infraestructura transversal, sin endpoints                   |
| Consumido por | Todos los feature modules                                    |
| Tests         | 70+ unitarios + `test/common.e2e-spec.ts` (18 casos)         |

---

## 1. Responsabilidad

Concentrar las piezas que cruzan todos los módulos: filtros de excepción, pipes
de validación, guards, interceptores, decoradores y configuración HTTP.

Regla: **si se usa en dos o más módulos y no tiene reglas de negocio, va acá.**

---

## 2. Estado actual

```
src/common/
├── common.module.ts                 # APP_FILTER + APP_PIPE + APP_INTERCEPTOR
├── filters/
│   ├── all-exceptions.filter.ts     # { detail } para todo no-2xx (ADR 0002)
│   └── all-exceptions.filter.spec.ts
├── http/
│   ├── cors-options.ts              # CORS_ORIGINS → enableCors (D-16)
│   ├── cors-options.spec.ts
│   ├── headers.ts                   # X-Response-Time-ms
│   ├── response-time.ts             # reloj compartido + middleware
│   └── response-time.spec.ts
├── interceptors/
│   ├── response-time.interceptor.ts # header de tiempo (D-11)
│   └── response-time.interceptor.spec.ts
├── pipes/
│   ├── validation.pipe.ts           # 422 + mensaje en español (ADR 0001)
│   ├── validation.pipe.spec.ts
│   ├── validation-messages.ts       # TRADUCCIONES_PYDANTIC → class-validator
│   └── validation-messages.spec.ts
├── time/
│   ├── process-timezone.ts          # proceso en UTC antes de conectar (MIG-43)
│   ├── process-timezone.spec.ts
│   ├── utc-date.ts                  # toIsoUtc + literales de timestamp
│   └── utc-date.spec.ts
├── transformers/
│   ├── numeric.transformer.ts        # numeric(10,2) ↔ number (MIG-31)
│   ├── numeric.transformer.spec.ts
│   ├── utc-timestamp.transformer.ts # timestamp without time zone ↔ Date
│   └── utc-timestamp.transformer.spec.ts
├── auth/
│   ├── authenticated-user.ts        # shape de `request.user`
│   └── auth-messages.ts             # literales 401/403 del contrato
├── decorators/
│   ├── public.decorator.ts          # @Public()
│   ├── roles.decorator.ts           # @Roles('admin')
│   └── current-user.decorator.ts    # @CurrentUser()
├── guards/
│   ├── jwt-auth.guard.ts            # validación del Bearer
│   ├── jwt-auth.guard.spec.ts
│   ├── roles.guard.ts               # admin/mozo
│   └── roles.guard.spec.ts
├── README.md · CONTRACT.md · DECISIONS.md · AGENTS.md
```

El prefijo `/api/v1` y el CORS no son providers: se aplican en
`src/app.setup.ts`, compartido por `main.ts` y los e2e.

---

## 3. Estructura objetivo

### Estructura de guards y decoradores

```
src/common/
├── auth/
│   ├── authenticated-user.ts      # shape público que viaja en request.user
│   └── auth-messages.ts           # 401/403 literales del contrato
├── decorators/
│   ├── public.decorator.ts        # @Public() para rutas sin auth
│   ├── roles.decorator.ts         # @Roles('admin')
│   └── current-user.decorator.ts  # @CurrentUser()
├── guards/
│   ├── jwt-auth.guard.ts
│   └── roles.guard.ts
└── (lo ya implementado en §2)
```

---

## 4. Qué va y qué no

| Va en `common`                            | No va en `common`                    |
| ----------------------------------------- | ------------------------------------ |
| `AllExceptionsFilter`                     | Lógica de negocio (va en el service) |
| `ValidationPipe` con `exceptionFactory`   | DTOs de un recurso                   |
| `JwtAuthGuard`, `RolesGuard`, `@Public()` | Entities                             |
| `numericTransformer`                      | Reglas de transición de estados      |
| `utcTimestampTransformer`, `toIsoUtc()`   | Helpers usados por un solo módulo    |
| CORS y prefijo (`app.setup.ts`)           | Fechas de negocio con zona local     |

---

## 5. Orden de implementación

```
MIG-20  →  prefijo /api/v1 + ValidationPipe 422 + AllExceptionsFilter + CORS ✅
MIG-21  →  utilidades de test / mocks de repositorio ✅
MIG-23  →  JwtAuthGuard + RolesGuard + @Public/@Roles/@CurrentUser ✅ (adelantado)
MIG-24  →  aplicar los guards al resto de los módulos + e2e 401/403
MIG-43  →  zona horaria UTC + transformer de fechas + `toIsoUtc()` ✅
MIG-31  →  `numericTransformer` compartido ✅ (adelantado por `pagos`)
MIG-44  →  aplicar el transformer a productos/pedidos/caja + esquema real
```

`CommonModule` registra los `APP_*` una sola vez en `AppModule`. Los e2e lo
importan directamente para probar el cableado real sin PostgreSQL.

---

## 6. Tests

| Pieza                            | Test esperado                                           |
| -------------------------------- | ------------------------------------------------------- |
| `AllExceptionsFilter`            | Cada status produce `{ detail }` y nada más.            |
| `ValidationPipe`                 | Body inválido → `422` con `Campo '<campo>': ...`.       |
| `validation-messages`            | Defaults, parámetros y mensajes propios del DTO.        |
| `buildCorsOptions`               | Lista, default legacy, wildcard y headers expuestos.    |
| `response-time`                  | Reloj compartido, header único y orden de las capas.    |
| `ResponseTimeInterceptor`        | El header existe, es numérico y también aparece en 4xx. |
| `pinProcessTimezone`             | El proceso queda en UTC aunque el sistema esté en ART.  |
| `toIsoUtc` / `parseUtcTimestamp` | Instante conocido con `Z`, round-trip y zonas.          |
| `utcTimestampTransformer`        | Escritura UTC, lectura UTC y nulos explícitos.          |
| `numericTransformer`             | `numeric` → `number`, cero, nulos y sin `NaN`.          |
| `JwtAuthGuard`                   | Bypass de `@Public()` y `detail` de 401.                |
| `RolesGuard`                     | `@Roles`, `@Public` y 403 con el mensaje del contrato.  |
| `test/common.e2e-spec.ts`        | Prefijo, CORS, header, 422, 400, 404 y 500.             |
| `test/auth.e2e-spec.ts`          | Guards reales: 401 sin token, 403 con rol insuficiente. |

---

## 7. Referencias

- [`CONTRACT.md`](./CONTRACT.md) · [`DECISIONS.md`](./DECISIONS.md)
- `docs/adr/0001`, `0002` y `0007` (fechas UTC)
- `docs/api-contract.md` §5 y §9
