# Módulo `mesas`

| Campo        | Valor                                               |
| ------------ | --------------------------------------------------- |
| Estado       | **Implementado (MIG-27)**                           |
| Entity       | `Mesa` → tabla `mesas` (unique por validar en MIG-44) |
| Endpoints    | 4 (ver [`CONTRACT.md`](./CONTRACT.md))              |
| Dependencias | `ACTIVE_ORDERS_PORT`, `common/guards`                |
| Tests        | Unitarios + e2e                                     |

---

## 1. Responsabilidad

Gestionar las mesas del salón y su estado operativo. Es el tablero que el mozo
usa para abrir, ocupar y liberar mesas.

Los cambios de estado automáticos (`pendiente_cobro`, `libre`) **no** los hace
este módulo: los dispara `pedidos` al entregar o cobrar.

---

## 2. Estado actual

El módulo expone los cuatro endpoints del contrato. La transición a limpieza
consulta `ACTIVE_ORDERS_PORT`; hasta que `pedidos` aporte su adapter, el provider
por defecto falla cerrado y la transición no se permite.

---

## 3. Estructura objetivo

```
src/mesas/
├── mesas.module.ts
├── mesas.controller.ts
├── mesas.service.ts
├── mesas.service.spec.ts
├── mesa-estado.ts
├── active-orders.port.ts
├── dto/
│   ├── create-mesa.dto.ts
│   ├── update-mesa.dto.ts
│   └── mesa-response.dto.ts
├── entities/
│   ├── mesa.entity.ts
│   └── mesa.entity.spec.ts
├── README.md · CONTRACT.md · DECISIONS.md
```

---

## 4. Modelo esperado

| Propiedad | Columna  | Tipo         | Restricción                |
| --------- | -------- | ------------ | -------------------------- |
| `id`      | `id`     | `serial`     | PK autoincremental         |
| `numero`  | `numero` | `int`        | `UNIQUE`, `> 0`            |
| `estado`  | `estado` | enum/varchar | default `libre`, 5 valores |

```ts
type MesaEstado =
  'libre' | 'ocupada' | 'reservada' | 'pendiente_cobro' | 'en_limpieza';
```

---

## 5. Reglas de negocio

- `numero` único; duplicado → `400` `Ya existe una mesa con el número N`.
- Transiciones manuales permitidas (ver [`docs/glossary.md`](../../docs/glossary.md) §3.2).
- Transición no permitida → `400` `No se puede cambiar el estado de 'X' a 'Y'`.
- No se puede pasar a `en_limpieza` si hay un pedido activo sin cobrar → `400`.
- `ocupada → pendiente_cobro` y `pendiente_cobro → libre` **no** son manuales.
- Mesa inexistente → `404` `Mesa no encontrada`.

---

## 6. Dependencias y efectos

| Evento                     | Efecto sobre la mesa        | Módulo dueño |
| -------------------------- | --------------------------- | ------------ |
| Pedido creado              | `ocupada`                   | `pedidos`    |
| Pedido `entregado`         | `pendiente_cobro`           | `pedidos`    |
| Pedido `cancelado`         | `libre`                     | `pedidos`    |
| Pedido cobrado             | `libre`                     | `pedidos`    |
| `PATCH /mesas/{id}` manual | según tabla de transiciones | `mesas`      |

**Regla de propiedad:** la validación de la transición puede vivir en
`MesasService`, pero la decisión de negocio que la dispara vive en `pedidos`.
Para evitar ciclos, `pedidos` usa `MesasService`; `mesas` depende del port
`ACTIVE_ORDERS_PORT`, que el módulo `pedidos` reemplazará por un adapter real.
El provider temporal falla cerrado ante ausencia de implementación.

---

## 7. Tests

- Lista de mesas ordenada por `numero`.
- Transición válida (`libre → ocupada`) actualiza el estado.
- Transición inválida (`pagado`-like) → `400`.
- `POST` con número duplicado → `400`.
- `GET /mesas/{id}` inexistente → `404`.
- e2e de `401` (sin token), `403` (mozo intentando `POST`) y acceso admin.

---

## 8. Referencias

- [`CONTRACT.md`](./CONTRACT.md) · [`DECISIONS.md`](./DECISIONS.md)
- `docs/api-contract.md` §6.2
- `docs/glossary.md` §3.2
