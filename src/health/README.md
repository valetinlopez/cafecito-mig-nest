# Módulo `health`

| Campo        | Valor                                             |
| ------------ | ------------------------------------------------- |
| Estado       | **Implementado**                                  |
| Endpoint     | `GET /` (fuera de `/api/v1`)                      |
| Dependencias | —                                                 |
| Tests        | `health.service.spec.ts` + `test/app.e2e-spec.ts` |

---

## 1. Responsabilidad

Verificar que el proceso está vivo y responder el shape de health del scaffold
NestJS. **No consulta la base de datos**: la conexión se valida al arrancar.

---

## 2. Estructura

```
src/health/
├── health.module.ts
├── health.controller.ts
├── health.service.ts
├── health.service.spec.ts
├── README.md
├── CONTRACT.md
└── DECISIONS.md
```

---

## 3. Capas

| Archivo                | Responsabilidad                                            |
| ---------------------- | ---------------------------------------------------------- |
| `health.controller.ts` | `GET /`, devuelve el `HealthStatus` del service.           |
| `health.service.ts`    | Construye el estado: servicio, versión, timestamp, uptime. |
| `health.module.ts`     | Registra controller y service.                             |

---

## 4. Service

| Método        | Retorna        | Regla                                                     |
| ------------- | -------------- | --------------------------------------------------------- |
| `getStatus()` | `HealthStatus` | `timestamp` ISO con `Z`; `uptime` redondeado en segundos. |

`SERVICE_VERSION` toma `process.env.npm_package_version` y cae a `0.0.1` cuando
se ejecuta fuera de npm.

---

## 5. Consideraciones

- Ruta **fuera** de `/api/v1`: `configureApp()` la excluye con `exclude: ['/']`
  (MIG-20).
- No debe depender de PostgreSQL: el front no lo consume y los e2e corren sin
  base.
- Si en el futuro se agrega un health profundo (DB, memoria), debe ser un
  endpoint distinto (`/health/ready`), no cambiar este shape (D-14).

---

## 6. Tests

- Unitario: `status`, `service`, `version`, `timestamp` con formato ISO y
  `uptime` numérico.
- e2e: `GET /` → `200` con el shape completo.

---

## 7. Referencias

- [`CONTRACT.md`](./CONTRACT.md) · [`DECISIONS.md`](./DECISIONS.md)
- `docs/api-contract.md` D-14, §6.10
