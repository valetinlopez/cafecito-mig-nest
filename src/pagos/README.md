# Módulo `pagos`

| Campo        | Valor                                                   |
| ------------ | ------------------------------------------------------- |
| Estado       | **Scaffold** (módulo registrado, sin código propio)     |
| Entity       | `Pago` → tabla `pagos` (por confirmar)                  |
| Endpoints    | **Ninguno propio** (ver [`CONTRACT.md`](./CONTRACT.md)) |
| Dependencias | `pedidos`, `caja`, `users`                              |
| Tests        | Pendientes                                              |

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
└── pagos.module.ts    # @Module({}) — vacío
```

---

## 3. Estructura objetivo

```
src/pagos/
├── pagos.module.ts
├── pagos.service.ts
├── pagos.service.spec.ts
├── entities/
│   └── pago.entity.ts
├── README.md · CONTRACT.md · DECISIONS.md
```

Sin controller ni DTOs de request: la entrada es el DTO de `pedidos`.

---

## 4. Modelo esperado

| Propiedad    | Columna       | Tipo            | Restricción                   |
| ------------ | ------------- | --------------- | ----------------------------- |
| `id`         | `id`          | `serial`        | PK                            |
| `pedidoId`   | `pedido_id`   | `int`           | FK a `pedidos`, único         |
| `cajaId`     | `caja_id`     | `int`           | FK a `cajas`                  |
| `usuarioId`  | `usuario_id`  | `int`           | FK a `usuarios` (quién cobró) |
| `monto`      | `monto`       | `numeric(10,2)` | `> 0`, transformer a `number` |
| `metodoPago` | `metodo_pago` | enum/varchar    | 5 valores del glosario        |
| `fecha`      | `fecha`       | `timestamp`     | default now, UTC naive        |

> Nombres y tipos exactos a confirmar contra la base (MIG-44). `fecha` es
> `timestamp without time zone` en el legacy: usar `utcTimestampTransformer` y
> serializar con `toIsoUtc()` (ADR 0007).

---

## 5. Operaciones del service

| Método                   | Uso                         |
| ------------------------ | --------------------------- |
| `registrarPago(data)`    | Desde el cobro en `pedidos` |
| `findByCaja(cajaId)`     | Movimientos de una caja     |
| `findByPedido(pedidoId)` | Verificar cobro existente   |

---

## 6. Reglas de negocio

- Un pedido tiene **como máximo un pago** (no hay cobros parciales).
- El monto es el total del pedido; no se acepta un monto del cliente.
- Requiere una caja `abierta`; el id se resuelve en el service, no en el request.
- El pago y el cambio de estado del pedido ocurren en la **misma transacción**.
- `metodo_pago` debe ser uno de los 5 valores; si no, `422`.

---

## 7. Tests esperados

- Registrar un pago guarda monto, método, caja y usuario.
- Segundo pago del mismo pedido → error de negocio.
- Los movimientos de una caja devuelven fecha ISO, mesa y nombre del usuario.
- El monto sale como `number`.

---

## 8. Referencias

- [`CONTRACT.md`](./CONTRACT.md) · [`DECISIONS.md`](./DECISIONS.md)
- `docs/api-contract.md` §6.5 (`POST /pago`) y §6.6 (`movimientos`)
- `docs/glossary.md` §2 y §4
