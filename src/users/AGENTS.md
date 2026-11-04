# AGENTS.md — `users`

> Instrucciones locales de este directorio. Leelo antes de tocar `src/users/`.

| Campo         | Valor                                               |
| ------------- | --------------------------------------------------- |
| Estado        | Implementado (entity + DTOs MIG-22, service MIG-25) |
| Contrato      | [`./CONTRACT.md`](./CONTRACT.md) — contrato interno |
| Decisiones    | [`./DECISIONS.md`](./DECISIONS.md)                  |
| Consumido por | `auth`, `empleados`, `pedidos`                      |

## Antes de implementar

1. [`README.md`](./README.md) — responsabilidad y modelo.
2. [`CONTRACT.md`](./CONTRACT.md) — shape `Usuario` y DTOs.
3. [`DECISIONS.md`](./DECISIONS.md) — dueño de la entity y normalización.
4. Si cambia la entity, repetir `npm run schema:log` contra una branch de Neon; no
   usar `synchronize` contra Neon.

## Reglas locales

- `users` es el **único dueño** de la entity `Usuario`; no crear otra en `empleados`.
- Sin controller: los endpoints de identidad son de `auth` y los de personal de `empleados`.
- `password_hash` nunca en un DTO de respuesta: además lleva `@Exclude()`.
- Email normalizado (minúsculas, sin espacios) y único.
- Sin borrado físico: `activo = false`.
- `auth` y `empleados` consumen `UsersService`, no el repositorio. El módulo no
  exporta `TypeOrmModule`.
- Rol: siempre `ROLES`/`Rol` de `rol.ts`; no repetir literales.

## Verificación

```bash
npm test -- users
npm run typecheck
```
