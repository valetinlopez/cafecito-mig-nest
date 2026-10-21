# AGENTS.md — `config`

> Instrucciones locales de este directorio. Leelo antes de tocar `src/config/`.

| Campo      | Valor                                               |
| ---------- | --------------------------------------------------- |
| Estado     | Implementado                                        |
| Contrato   | [`./CONTRACT.md`](./CONTRACT.md) — contrato interno |
| Decisiones | [`./DECISIONS.md`](./DECISIONS.md)                  |

## Antes de editar

1. [`README.md`](./README.md) — namespaces y prioridades.
2. [`CONTRACT.md`](./CONTRACT.md) — variables y tipos garantizados.
3. [`DECISIONS.md`](./DECISIONS.md) — reglas de resolución.

## Reglas locales

- Módulo de infraestructura: **no expone HTTP**.
- Toda variable nueva entra por `env.validation.ts`, con default en
  `env.helpers.ts` y test en `*.spec.ts`.
- `NODE_ENV` gana sobre `ENVIRONMENT`; `DATABASE_URL` gana sobre las `DB_*`.
- Validación **fail-fast**: si falta un obligatorio, el proceso no arranca.
- En producción no se leen archivos `.env`.
- Nunca commitear secretos reales; el valor de ejemplo se rechaza en producción.

## Verificación

```bash
npm test -- config
npm run typecheck
```
