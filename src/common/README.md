# Módulo `common`

| Campo         | Valor                                      |
| ------------- | ------------------------------------------ |
| Estado        | **Scaffolding** (solo `.gitkeep`)          |
| Tipo          | Infraestructura transversal, sin endpoints |
| Consumido por | Todos los feature modules                  |
| Tests         | Los tendrá cada pieza al implementarse     |

---

## 1. Responsabilidad

Concentrar las piezas que cruzan todos los módulos: filtros de excepción, pipes
de validación, guards, interceptores, decoradores y transformers de TypeORM.

Regla: **si se usa en dos o más módulos y no tiene reglas de negocio, va acá.**

---

## 2. Estado actual

```
src/common/
├── decorators/.gitkeep
├── filters/.gitkeep
├── guards/.gitkeep
├── interceptors/.gitkeep
└── pipes/.gitkeep
```

No hay implementaciones. Las piezas llegan con los tickets transversales
(MIG-20, MIG-21, MIG-24).

---

## 3. Estructura objetivo

```
src/common/
├── decorators/
│   ├── public.decorator.ts        # @Public() para rutas sin auth
│   ├── roles.decorator.ts         # @Roles('admin')
│   └── current-user.decorator.ts  # @CurrentUser()
├── filters/
│   └── all-exceptions.filter.ts   # { detail } (ADR 0002)
├── guards/
│   ├── jwt-auth.guard.ts
│   └── roles.guard.ts
├── interceptors/
│   └── response-time.interceptor.ts # X-Response-Time-ms (D-11, opcional)
├── pipes/
│   └── validation.pipe.ts         # 422 + mensaje en español (ADR 0001)
├── transformers/
│   └── numeric.transformer.ts     # numeric → number (ADR 0004)
├── README.md · CONTRACT.md · DECISIONS.md
```

---

## 4. Qué va y qué no

| Va en `common`                            | No va en `common`                    |
| ----------------------------------------- | ------------------------------------ |
| `AllExceptionsFilter`                     | Lógica de negocio (va en el service) |
| `ValidationPipe` con `exceptionFactory`   | DTOs de un recurso                   |
| `JwtAuthGuard`, `RolesGuard`, `@Public()` | Entities                             |
| `numericTransformer`                      | Reglas de transición de estados      |
| Utilidades de test compartidas (MIG-21)   | Helpers usados por un solo módulo    |

---

## 5. Orden de implementación

```
MIG-20  →  prefijo /api/v1 + ValidationPipe 422 + AllExceptionsFilter + CORS
MIG-21  →  utilidades de test / mocks de repositorio
MIG-24  →  JwtAuthGuard + RolesGuard + @Public/@Roles
MIG-44  →  numericTransformer + serialización de fechas
```

Cada pieza se registra globalmente en `AppModule` (`APP_FILTER`, `APP_PIPE`,
`APP_GUARD`, `APP_INTERCEPTOR`) salvo los guards por controller, que se aplican
con `@UseGuards`.

---

## 6. Tests

| Pieza                      | Test esperado                                     |
| -------------------------- | ------------------------------------------------- |
| `AllExceptionsFilter`      | Cada status produce `{ detail }` y nada más.      |
| `ValidationPipe`           | Body inválido → `422` con `Campo '<campo>': ...`. |
| `JwtAuthGuard`             | Sin token / token inválido / expirado → `401`.    |
| `RolesGuard`               | Rol insuficiente → `403`.                         |
| `numericTransformer`       | `from('850.00') === 850`; `null` se preserva.     |
| `response-time` (opcional) | El header existe y es numérico.                   |

---

## 7. Referencias

- [`CONTRACT.md`](./CONTRACT.md) · [`DECISIONS.md`](./DECISIONS.md)
- `docs/adr/0001` a `0005`
- `docs/architecture.md` §9
