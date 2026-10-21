# AGENTS.md — `categorias`

> Instrucciones locales de este directorio. Leelo antes de tocar `src/categorias/`.

| Campo                | Valor                                             |
| -------------------- | ------------------------------------------------- |
| Estado               | Implementado (solo lectura)                       |
| Contrato             | [`./CONTRACT.md`](./CONTRACT.md) · global §6.4    |
| Decisiones           | [`./DECISIONS.md`](./DECISIONS.md)                |
| Módulo de referencia | Sí: es la plantilla para el resto de los módulos. |

## Antes de editar

1. [`README.md`](./README.md) — capas y estructura.
2. [`CONTRACT.md`](./CONTRACT.md) — shape `{ id, nombre }`.
3. [`DECISIONS.md`](./DECISIONS.md) — reglas locales.

## Reglas locales

- El orden se resuelve en la base (`ORDER BY nombre ASC`), nunca en memoria.
- Nunca serializar `Categoria`: siempre `CategoriaResponseDto.fromEntity()`.
- Sin barrels: imports al archivo concreto con extensión `.js`.
- `@Unique('categorias_nombre_key', ['nombre'])` con el nombre real de PostgreSQL.
- No agregar `POST`/`PATCH`/`DELETE`: el contrato es solo lectura.
- El guard JWT está pendiente (MIG-24); no inventar uno parcial.

## Verificación

```bash
npm test -- categorias
npm run test:e2e
```
