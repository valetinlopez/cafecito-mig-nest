# AGENTS.md — `database`

> Instrucciones locales de este directorio. Leelo antes de tocar `src/database/`.

| Campo      | Valor                                               |
| ---------- | --------------------------------------------------- |
| Estado     | Implementado                                        |
| Contrato   | [`./CONTRACT.md`](./CONTRACT.md) — contrato interno |
| Decisiones | [`./DECISIONS.md`](./DECISIONS.md)                  |

## Antes de editar

1. [`README.md`](./README.md) — conexión, pool y migraciones.
2. [`DECISIONS.md`](./DECISIONS.md) — reglas de esquema.

## Reglas locales

- La base de Neon es **compartida con producción**: el esquema no se toca solo.
- `synchronize` nunca en producción; en desarrollo solo con host local.
- Todo cambio de esquema va por migración revisada.
- Las opciones viven en `typeorm-options.ts`: no duplicarlas en el CLI.
- `autoLoadEntities: true`; las entities se registran con `forFeature` en su módulo.
- Mantener el pool preparado para Neon (`idleTimeoutMillis`, `keepAlive`).

## Verificación

```bash
npm test -- typeorm-options
npm run schema:log   # sin diferencias inesperadas
```
