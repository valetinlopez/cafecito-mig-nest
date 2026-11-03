# AGENTS.md — `reportes`

> Instrucciones locales de este directorio. Leelo antes de tocar `src/reportes/`.

| Campo      | Valor                                            |
| ---------- | ------------------------------------------------ |
| Estado     | Implementado (MIG-37)                            |
| Contrato   | [`./CONTRACT.md`](./CONTRACT.md) · global §6.9   |
| Decisiones | [`./DECISIONS.md`](./DECISIONS.md)               |
| Depende de | `pagos`, `caja`, `pedidos`, `productos`, `mesas` |

## Antes de implementar

1. [`README.md`](./README.md) — bloques del reporte.
2. [`CONTRACT.md`](./CONTRACT.md) — shape y errores.
3. [`DECISIONS.md`](./DECISIONS.md) — rango, denominador y cajas.

## Reglas locales

- Solo lectura: no escribe ni tiene entity propia.
- `desde`/`hasta` obligatorios, `YYYY-MM-DD`, rango **inclusivo**.
- Si `desde > hasta` → `400`; formato inválido → `422`.
- El eje del período es `pagos.fecha`, convertido desde la zona del negocio a
  UTC con `src/common/time/business-timezone.ts`. No reimplementar la conversión.
- Agregados en SQL; una consulta por bloque, en paralelo.
- `ticket_promedio = total_vendido / cantidad_cobros`; `0` si no hay cobros.
- `productos_mas_vendidos`: `ORDER BY cantidad DESC`, máximo 20.
- `cajas`: solo las que intersectan el rango; `ventas_efectivo` es de toda la
  caja, no del período.
- `diferencia` puede ser negativa o `null`; no normalizarla.
- Arrays vacíos, nunca `null`. Sin paginación.

## Verificación

```bash
npm test -- reportes
npm run test:e2e
```
