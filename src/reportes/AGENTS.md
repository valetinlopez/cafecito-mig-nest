# AGENTS.md — `reportes`

> Instrucciones locales de este directorio. Leelo antes de tocar `src/reportes/`.

| Campo      | Valor                                            |
| ---------- | ------------------------------------------------ |
| Estado     | Scaffold (módulo vacío)                          |
| Contrato   | [`./CONTRACT.md`](./CONTRACT.md) · global §6.9   |
| Decisiones | [`./DECISIONS.md`](./DECISIONS.md)               |
| Depende de | `pagos`, `caja`, `pedidos`, `productos`, `mesas` |

## Antes de implementar

1. [`README.md`](./README.md) — bloques del reporte.
2. [`CONTRACT.md`](./CONTRACT.md) — shape y errores.
3. [`DECISIONS.md`](./DECISIONS.md) — rango inclusivo y zona horaria.

## Reglas locales

- `desde`/`hasta` obligatorios, `YYYY-MM-DD`, rango **inclusivo**.
- Si `desde > hasta` → `400`; formato inválido → `422`.
- Interpretar el rango en la zona de negocio y convertir a UTC para filtrar.
- Agregados en SQL; una consulta por bloque, en paralelo.
- `ticket_promedio = 0` si no hay pedidos cobrados (nunca `null`/`Infinity`).
- `diferencia` puede ser negativa o `null`; no normalizarla.
- Arrays vacíos, nunca `null`. Sin paginación.

## Verificación

```bash
npm test -- reportes
npm run test:e2e
```
