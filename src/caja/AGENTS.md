# AGENTS.md — `caja`

> Instrucciones locales de este directorio. Leelo antes de tocar `src/caja/`.

| Campo      | Valor                                          |
| ---------- | ---------------------------------------------- |
| Estado     | Implementado (MIG-32)                          |
| Contrato   | [`./CONTRACT.md`](./CONTRACT.md) · global §6.6 |
| Decisiones | [`./DECISIONS.md`](./DECISIONS.md)             |
| Depende de | `pagos`, `users`                               |

## Antes de cambiar el módulo

1. [`README.md`](./README.md) — reglas de apertura/cierre.
2. [`CONTRACT.md`](./CONTRACT.md) — 5 endpoints.
3. [`DECISIONS.md`](./DECISIONS.md) — `null` literal y totales derivados.

## Reglas locales

- `GET /caja/` sin caja abierta devuelve **`null` literal**, no body vacío.
- `total_ventas` se calcula sumando pagos; no es columna.
- Una sola caja abierta: advisory transaction lock y validación antes de insertar.
- Cierre: transacción + `pessimistic_write` sobre la caja abierta.
- No persistir `diferencia`; se calcula en reportes.
- Movimientos = pagos de la caja (sin tabla espejo por ahora).
- Historial ordenado por `fecha_apertura DESC`.
- Todos los endpoints requieren `admin`.

## Verificación

```bash
npm test -- caja
npm run test:e2e
```
