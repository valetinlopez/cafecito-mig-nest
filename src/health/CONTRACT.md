# Contrato — `health`

> Extracto de [`docs/api-contract.md`](../../docs/api-contract.md) §6.10 (D-14).

---

## `GET /`

- **Auth:** público
- **Prefijo:** **fuera** de `/api/v1`
- **Éxito:** `200` · `HealthStatus`
- **Errores:** —

### Response `200`

```json
{
  "status": "ok",
  "service": "backend-nest",
  "version": "0.0.1",
  "timestamp": "2026-10-19T23:00:00.000Z",
  "uptime": 12
}
```

### Tipo

```ts
interface HealthStatus {
  status: 'ok';
  service: string;
  version: string;
  timestamp: string; // ISO-8601 UTC con Z
  uptime: number; // segundos
}
```

### Reglas

| Regla                            | Verificación                  |
| -------------------------------- | ----------------------------- |
| No consulta la base              | Responde con PostgreSQL caído |
| `status` siempre `"ok"`          | Literal, no variable          |
| `timestamp` ISO-8601 UTC con `Z` | `new Date().toISOString()`    |
| Ruta sin prefijo                 | `GET /`, no `GET /api/v1/`    |

> Es un cambio intencional frente al legacy (`{ message, version }`); el front no
> lo consume (D-14).
