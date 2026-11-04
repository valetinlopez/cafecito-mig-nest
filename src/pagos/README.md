# Módulo `pagos`

| Campo        | Valor                                                   |
| ------------ | ------------------------------------------------------- |
| Estado       | **Implementado** (MIG-31 + MIG-32 + MIG-33)             |
| Entity       | `Pago` → tabla `pagos` (validado en MIG-44)             |
| Endpoints    | **Ninguno propio** (ver [`CONTRACT.md`](./CONTRACT.md)) |
| Dependencias | `pedidos`; entity `Caja` para calcular el período       |
| Tests        | Unitarios (entity, DTO, método, service)                |

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
├── pagos.service.ts         # movimientos/ventas MIG-32 y registro MIG-33
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
| `pedidoId`   | `pedido_id`   | `int`           | FK a `pedidos`, not null          |
| `metodoPago` | `metodo_pago` | `varchar(30)`   | 5 valores del glosario            |
| `monto`      | `monto`       | `numeric(10,2)` | `number` vía `numericTransformer` |
| `fecha`      | `fecha`       | `timestamp`     | la asigna el service, UTC naive   |

- La tabla no guarda la caja ni quién cobró, y no tiene restricción única: ver
  `DECISIONS.md` D-13 y ADR 0009.
- `monto` y `fecha` usan los transformers compartidos de `src/common/`: el JSON
  nunca expone un string ni un `Date` crudo (D-05, D-06).
- Un pago pertenece a la caja de su período (`pago-periodo-caja.ts`).

---

## 4. Operaciones del service

| Método                             | Uso                         | Estado              |
| ---------------------------------- | --------------------------- | ------------------- |
| `registrarPago(manager, data)`     | Desde el cobro en `pedidos` | Implementado MIG-33 |
| `findByCaja(cajaId)`               | Movimientos de una caja     | MIG-32; MIG-44      |
| `findByPedido(pedidoId, manager?)` | Verificar cobro existente   | Implementado MIG-33 |

`findByCaja(cajaId)`, `getTotalVentas(cajaId)` y `getTotalesVentas(cajaIds)` calculan
sobre el período de la caja desde MIG-44. El registro del pago requiere el `EntityManager` del
cobro para pertenecer a la misma transacción; la búsqueda puede reutilizarlo.

---

## 5. Reglas de negocio

- Un pedido tiene **como máximo un pago** (no hay cobros parciales).
- El monto es el total del pedido; no se acepta un monto del cliente.
- Requiere una caja `abierta`, verificada en el cobro; no se guarda ni se recibe su id.
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
