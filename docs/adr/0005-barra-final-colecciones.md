# 0005 — Barra final equivalente en colecciones

| Campo     | Valor                        |
| --------- | ---------------------------- |
| Estado    | Aceptado                     |
| Fecha     | 2026-10-20                   |
| Decisores | Equipo backend (3 devs)      |
| Tags      | api, routing, compatibilidad |

## Contexto

El frontend llama a las colecciones **con barra final** (`/mesas/`, `/pedidos/`,
`/caja/`) y a los ítems **sin barra** (`/mesas/{id}`). El legacy lo resolvía con
el redirect automático de Starlette (`307`), que el cliente seguía de forma
transparente.

En Express, `/mesas` y `/mesas/` matchean la misma ruta por defecto (no hay
`strict routing`), pero un redirect o una diferencia de comportamiento rompería
el contrato.

## Decisión

Ambas formas responden **igual**, con el mismo status y body, **sin redirect**
(`301`/`307`/`308`).

```
GET /api/v1/mesas   → 200
GET /api/v1/mesas/  → 200
```

## Alternativas consideradas

| Alternativa                 | Por qué se descarta                            |
| --------------------------- | ---------------------------------------------- |
| Exigir un solo formato      | Obliga a tocar todos los stores del front.     |
| Redirect permanente         | El contrato prohíbe el `3xx`; agrega latencia. |
| Normalizar en un middleware | Innecesario si no se activa `strict routing`.  |

## Consecuencias

**Positivas**

- Cero cambios en el frontend.
- Comportamiento uniforme en todas las colecciones.

**Negativas / costos**

- Hay que **testearlo**: es una propiedad del framework, fácil de romper al
  configurar el router.
- No se debe activar `strict routing` en Express.

## Implementación

No habilitar `strict routing`. Cubrir cada colección con un e2e que compare
`GET /api/v1/<recurso>` y `GET /api/v1/<recurso>/`: mismo status, mismo body y
sin cabecera `Location`.

**Verificación:** `test/categorias.e2e-spec.ts` ya cubre el patrón.

## Referencias

- `docs/api-contract.md` D-04, §9.7
- `docs/conventions.md` §7
- Tickets MIG-18, MIG-20
