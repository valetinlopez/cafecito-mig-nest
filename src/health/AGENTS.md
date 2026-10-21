# AGENTS.md — `health`

> Instrucciones locales de este directorio. Leelo antes de tocar `src/health/`.

| Campo      | Valor                                                  |
| ---------- | ------------------------------------------------------ |
| Estado     | Implementado                                           |
| Contrato   | [`./CONTRACT.md`](./CONTRACT.md) · global §6.10 (D-14) |
| Decisiones | [`./DECISIONS.md`](./DECISIONS.md)                     |

## Antes de editar

1. [`README.md`](./README.md) — responsabilidad y límites.
2. [`CONTRACT.md`](./CONTRACT.md) — shape `HealthStatus`.

## Reglas locales

- `GET /` queda **fuera** de `/api/v1`; al configurar el prefijo global excluirlo.
- El health **no consulta la base**: debe responder con PostgreSQL caído.
- No cambiar el shape: el contrato D-14 lo fija.
- Si se necesita readiness con DB, crear un endpoint separado, no tocar este.
- `timestamp` siempre ISO-8601 UTC con `Z`; `uptime` en segundos.

## Verificación

```bash
npm test -- health
npm run test:e2e
```
