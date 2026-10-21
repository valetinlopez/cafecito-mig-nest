# AGENTS.md — `users`

> Instrucciones locales de este directorio. Leelo antes de tocar `src/users/`.

| Campo         | Valor                                               |
| ------------- | --------------------------------------------------- |
| Estado        | Scaffold (módulo vacío)                             |
| Contrato      | [`./CONTRACT.md`](./CONTRACT.md) — contrato interno |
| Decisiones    | [`./DECISIONS.md`](./DECISIONS.md)                  |
| Consumido por | `auth`, `empleados`, `pedidos`                      |

## Antes de implementar

1. [`README.md`](./README.md) — responsabilidad y modelo esperado.
2. [`CONTRACT.md`](./CONTRACT.md) — shape `Usuario` y API del service.
3. [`DECISIONS.md`](./DECISIONS.md) — dueño de la entity y normalización.
4. Confirmar nombres reales de tabla/columnas (MIG-44) antes de crear la entity.

## Reglas locales

- `users` es el **único dueño** de la entity `Usuario`; no crear otra en `empleados`.
- Sin controller: los endpoints de identidad son de `auth` y los de personal de `empleados`.
- `password_hash` nunca en un DTO de respuesta.
- Email normalizado (minúsculas, sin espacios) y único.
- Sin borrado físico: `activo = false`.
- `auth` y `empleados` consumen `UsersService`, no el repositorio.

## Verificación

```bash
npm test -- users
npm run typecheck
```
