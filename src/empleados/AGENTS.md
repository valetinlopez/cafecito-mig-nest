# AGENTS.md — `empleados`

> Instrucciones locales de este directorio. Leelo antes de tocar `src/empleados/`.

| Campo      | Valor                                          |
| ---------- | ---------------------------------------------- |
| Estado     | Implementado parcial (DTOs, MIG-22)            |
| Contrato   | [`./CONTRACT.md`](./CONTRACT.md) · global §6.8 |
| Decisiones | [`./DECISIONS.md`](./DECISIONS.md)             |
| Depende de | `users`                                        |

## Antes de implementar

1. [`README.md`](./README.md) — reglas de personal.
2. [`CONTRACT.md`](./CONTRACT.md) — 3 endpoints.
3. [`DECISIONS.md`](./DECISIONS.md) — rol forzado y baja lógica.
4. `src/users/` — de ahí sale `UsersService`.
5. `src/empleados/dto/` — los DTOs ya existen y no aceptan `rol`.

## Reglas locales

- Empleado = `Usuario` con `rol = mozo`: **no crear otra entity ni tabla**.
- El alta fuerza `mozo`; `EmpleadoUpdate` no acepta `rol`.
- No se puede desactivar el propio usuario → `400`.
- Baja lógica (`activo = false`), nunca `DELETE`.
- Inyectar `UsersService`, no el repositorio de usuarios.
- La respuesta reusa `UsuarioResponseDto` (`users/dto/`).
- Todos los endpoints requieren `admin`; e2e de `403` con token de mozo.

## Verificación

```bash
npm test -- empleados
npm run test:e2e
```
