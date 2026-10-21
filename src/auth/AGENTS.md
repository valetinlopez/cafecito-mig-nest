# AGENTS.md — `auth`

> Instrucciones locales de este directorio. Leelo antes de tocar `src/auth/`.

| Campo      | Valor                                          |
| ---------- | ---------------------------------------------- |
| Estado     | Scaffold (módulo vacío)                        |
| Contrato   | [`./CONTRACT.md`](./CONTRACT.md) · global §6.1 |
| Decisiones | [`./DECISIONS.md`](./DECISIONS.md)             |
| Depende de | `users` (entity `Usuario`), `config/auth`      |

## Antes de implementar

1. [`README.md`](./README.md) — piezas y orden de implementación.
2. [`CONTRACT.md`](./CONTRACT.md) — 7 endpoints y shapes.
3. [`DECISIONS.md`](./DECISIONS.md) — JWT, bcrypt y mensajes exactos.
4. `src/users/` — de ahí sale la entity y `UsersService`.

## Reglas locales

- JWT HS256, 480 minutos (`ACCESS_TOKEN_EXPIRE_MINUTES`).
- `password_hash` nunca cruza el borde HTTP; DTO con `fromEntity()`.
- `bcrypt` para hashing (compatible con usuarios del legacy).
- `reset_token` solo en `development`; en el resto, `null`.
- Mensajes de error literales del contrato; no reescribirlos.
- `POST /auth/register` requiere `admin`.
- No crear un `APP_GUARD` global sin marcar antes las rutas públicas.

## Verificación

```bash
npm test -- auth
npm run test:e2e
```
