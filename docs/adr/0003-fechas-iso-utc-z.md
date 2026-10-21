# 0003 — Fechas ISO-8601 UTC con `Z`

| Campo     | Valor                   |
| --------- | ----------------------- |
| Estado    | Aceptado                |
| Fecha     | 2026-10-20              |
| Decisores | Equipo backend (3 devs) |
| Tags      | api, fechas, timezone   |

## Contexto

El legacy guarda `datetime.utcnow` (UTC **naive**) y lo serializa sin zona:
`2026-10-19T20:24:10`. El navegador interpreta ese string como hora **local**;
en `America/Argentina/Buenos_Aires` (UTC-3) las fechas se muestran 3 horas
adelantadas.

El front ya usa `new Date(...)` para renderizar, así que un ISO con `Z` lo
interpreta correctamente sin cambiar código.

## Decisión

Todas las fechas de la API se serializan como **ISO-8601 UTC con sufijo `Z` y
milisegundos**:

```
2026-10-19T20:24:10.000Z
```

Y las columnas se modelan como `timestamptz`.

## Alternativas consideradas

| Alternativa                  | Por qué se descarta                                   |
| ---------------------------- | ----------------------------------------------------- |
| Mantener el formato naive    | Bug de zona horaria visible en toda la UI.            |
| Enviar timestamp epoch       | El contrato y el front esperan string ISO.            |
| Enviar hora local con offset | El legacy es UTC; cambiar el eje agrava la migración. |

## Consecuencias

**Positivas**

- Corrige el desfase de 3 horas sin tocar el front.
- Formato estándar y ordenable lexicográficamente.

**Negativas / costos**

- Cambio visible: los horarios mostrarán 3 horas menos (el valor correcto).
- Requiere **QA visual** de las pantallas con fechas.

## Implementación

- Columnas `@Column({ type: 'timestamptz' })`.
- Serialización con `Date.toISOString()` en el DTO de response (o interceptor
  global). Nunca devolver el `Date` crudo.
- Fechas de filtro (`desde`/`hasta` de reportes) siguen en `YYYY-MM-DD`.

**Verificación:** e2e que valide el patrón `^\d{4}-\d{2}-\d{2}T.*Z$` en las
respuestas con fechas.

## Referencias

- `docs/api-contract.md` D-06, §3, §9.5
- `docs/conventions.md` §6.1
- Ticket MIG-44
