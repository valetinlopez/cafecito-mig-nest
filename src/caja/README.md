# Módulo `caja`

| Campo        | Valor                                               |
| ------------ | --------------------------------------------------- |
| Estado       | **Scaffold** (módulo registrado, sin código propio) |
| Entities     | `Caja` (+ movimientos derivados de `pagos`)         |
| Endpoints    | 5 (ver [`CONTRACT.md`](./CONTRACT.md))              |
| Dependencias | `pagos`, `users`, `common/guards`                   |
| Tests        | Pendientes                                          |

---

## 1. Responsabilidad

Gestionar el turno de caja: apertura con monto inicial, consulta del estado,
historial, movimientos y cierre con monto final.

Solo puede haber **una caja abierta** a la vez. Es el punto donde se consolidan
los cobros del día.

---

## 2. Estado actual

```
src/caja/
└── caja.module.ts    # @Module({}) — vacío
```

---

## 3. Estructura objetivo

```
src/caja/
├── caja.module.ts
├── caja.controller.ts
├── caja.service.ts
├── caja.service.spec.ts
├── dto/
│   ├── caja-apertura.dto.ts
│   ├── caja-cierre.dto.ts
│   ├── caja-response.dto.ts
│   └── movimiento-caja-response.dto.ts
├── entities/
│   └── caja.entity.ts
├── README.md · CONTRACT.md · DECISIONS.md
```

---

## 4. Modelo esperado

| Propiedad       | Columna          | Tipo            | Restricción            |
| --------------- | ---------------- | --------------- | ---------------------- |
| `id`            | `id`             | `serial`        | PK                     |
| `fechaApertura` | `fecha_apertura` | `timestamptz`   | not null               |
| `fechaCierre`   | `fecha_cierre`   | `timestamptz`   | nullable               |
| `montoInicial`  | `monto_inicial`  | `numeric(10,2)` | `>= 0`                 |
| `montoFinal`    | `monto_final`    | `numeric(10,2)` | nullable               |
| `estado`        | `estado`         | enum/varchar    | `abierta` \| `cerrada` |

`total_ventas` **no es columna**: se calcula sumando los pagos de la caja.

---

## 5. Reglas de negocio

- Abrir con una caja ya abierta → `400` `Ya hay una caja abierta`.
- Cerrar sin caja abierta → `400` `No hay una caja abierta`.
- `GET /caja/` sin caja abierta → `200` con body **`null` literal** (D-09).
- Historial ordenado por `fecha_apertura` descendente.
- Movimientos de una caja inexistente → `404` `Caja no encontrada`.
- Todos los endpoints requieren `admin`.
- El cierre calcula `monto_final` a partir del body; `total_ventas` y
  `diferencia` se derivan.

---

## 6. Dependencias

```
pagos (movimientos)  →  caja (consolidación)  →  reportes
```

`caja` consume `PagosService` para movimientos y totales. `pedidos` consume
`CajaService` para validar que hay una caja abierta antes de cobrar.

---

## 7. Tests esperados

- Apertura cuando no hay caja → `201` con estado `abierta`.
- Apertura con caja abierta → `400`.
- `GET /caja/` sin caja → body exactamente `null`.
- Cierre sin caja abierta → `400`.
- Cierre actualiza estado, `fecha_cierre` y `monto_final`.
- Movimientos ordenados y con monto numérico.
- e2e de `403` con rol `mozo`.

---

## 8. Referencias

- [`CONTRACT.md`](./CONTRACT.md) · [`DECISIONS.md`](./DECISIONS.md)
- `docs/api-contract.md` §6.6
- `docs/glossary.md` §4
