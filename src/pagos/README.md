# Módulo `pagos`

| Campo        | Valor                                                   |
| ------------ | ------------------------------------------------------- |
| Estado       | **Entity + DTOs** (MIG-31); lógica del cobro en MIG-33  |
| Entity       | `Pago` → tabla `pagos` (mapeo a confirmar en MIG-44)    |
| Endpoints    | **Ninguno propio** (ver [`CONTRACT.md`](./CONTRACT.md)) |
| Dependencias | `pedidos`, `caja`, `users`                              |
| Tests        | Unitarios (`entity`, `dto`, `metodo-pago`, `service`)   |

---

## 1. Responsabilidad

Persistir los cobros y exponerlos como movimientos de caja. No tiene endpoints:
el cobro se dispara desde `POST /api/v1/pedidos/{id}/pago`, y los movimientos se
leen desde `GET /api/v1/caja/{id}/movimientos`.

Es un módulo de **soporte**: existe para que `pedidos` y `caja` no dupliquen la
entity ni las reglas del cobro.

---

## 2. Estado actual

```
src/pagos/
├── pagos.module.ts          # forFeature([Pago]) + exporta PagosService
├── pagos.service.ts         # movimientos y ventas MIG-32; cobro MIG-33 pendiente
├── pagos.service.spec.ts
├── metodo-pago.ts           # METODOS_PAGO + type MetodoPago
├── metodo-pago.spec.ts
├── entities/
│   ├── pago.entity.ts
│   └── pago.entity.spec.ts
├── dto/
│   ├── pago-response.dto.ts
│   └── pago-response.dto.spec.ts
├── README.md · CONTRACT.md · DECISIONS.md · AGENTS.md
```

Sin controller y sin DTOs de request: la entrada es el DTO de `pedidos`.

---

## 3. Modelo

| Propiedad    | Columna       | Tipo            | Restricción                       |
| ------------ | ------------- | --------------- | --------------------------------- |
| `id`         | `id`          | `serial`        | PK                                |
| `pedidoId`   | `pedido_id`   | `int`           | `UNIQUE`, not null                |
| `cajaId`     | `caja_id`     | `int`           | FK a `cajas`, **nullable**        |
| `usuarioId`  | `usuario_id`  | `int`           | FK a `usuarios`, **nullable**     |
| `metodoPago` | `metodo_pago` | `varchar(30)`   | 5 valores del glosario            |
| `monto`      | `monto`       | `numeric(10,2)` | `number` vía `numericTransformer` |
| `fecha`      | `fecha`       | `timestamp`     | default `now()`, UTC naive        |

- La restricción se declara con el nombre real de PostgreSQL
  (`pagos_pedido_id_key`) para que `schema:log` no proponga recrearla.
- `monto` y `fecha` usan los transformers compartidos de `src/common/`: el JSON
  nunca expone un string ni un `Date` crudo (D-05, D-06).
- `caja_id` y `usuario_id` son nullable por los pagos históricos; la regla
  "todo cobro nuevo pertenece a la caja abierta" se valida en el service
  (`DECISIONS.md` D-08).

> Nombres y tipos exactos se confirman contra la base en MIG-44. Las relaciones
> ORM (`@ManyToOne`) se agregan cuando existan las entities `Pedido` y `Caja`.

---

## 4. Operaciones del service

| Método                   | Uso                         | Estado |
| ------------------------ | --------------------------- | ------ |
| `registrarPago(data)`    | Desde el cobro en `pedidos` | MIG-33 |
| `findByCaja(cajaId)`     | Movimientos de una caja     | MIG-32 |
| `findByPedido(pedidoId)` | Verificar cobro existente   | MIG-33 |

`findByCaja(cajaId)`, `getTotalVentas(cajaId)` y `getTotalesVentas(cajaIds)` están
implementados en MIG-32. `registrarPago()` y `findByPedido()` permanecen con
`501` hasta MIG-33.

---

## 5. Reglas de negocio

- Un pedido tiene **como máximo un pago** (no hay cobros parciales).
- El monto es el total del pedido; no se acepta un monto del cliente.
- Requiere una caja `abierta`; el id se resuelve en el service, no en el request.
- El pago y el cambio de estado del pedido ocurren en la **misma transacción**.
- `metodo_pago` debe ser uno de los 5 valores; si no, `422`.

---

## 6. Tests

| Archivo                     | Qué cubre                                                                   |
| --------------------------- | --------------------------------------------------------------------------- |
| `pago.entity.spec.ts`       | Tabla, columnas snake_case, unique, transformers y ausencia de relaciones.  |
| `pago-response.dto.spec.ts` | `monto` number, `fecha` con `Z`, claves internas fuera del JSON.            |
| `metodo-pago.spec.ts`       | Los 5 métodos del glosario, en snake_case.                                  |
| `pagos.service.spec.ts`     | Proyección de movimientos, orden DESC, usuario nullable y ventas agregadas. |

---

## 7. Referencias

- [`CONTRACT.md`](./CONTRACT.md) · [`DECISIONS.md`](./DECISIONS.md)
- `docs/api-contract.md` §6.5 (`POST /pago`) y §6.6 (`movimientos`)
- `docs/glossary.md` §2 y §4
- `docs/adr/0004-decimales-number.md` · `docs/adr/0007-zona-horaria-proceso.md`
