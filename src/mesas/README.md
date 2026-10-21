# Módulo `mesas`

| Campo        | Valor                                               |
| ------------ | --------------------------------------------------- |
| Estado       | **Scaffold** (módulo registrado, sin código propio) |
| Entity       | `Mesa` → tabla `mesas` (por confirmar)              |
| Endpoints    | 4 (ver [`CONTRACT.md`](./CONTRACT.md))              |
| Dependencias | `pedidos` (efectos de estado), `common/guards`      |
| Tests        | Pendientes                                          |

---

## 1. Responsabilidad

Gestionar las mesas del salón y su estado operativo. Es el tablero que el mozo
usa para abrir, ocupar y liberar mesas.

Los cambios de estado automáticos (`pendiente_cobro`, `libre`) **no** los hace
este módulo: los dispara `pedidos` al entregar o cobrar.

---

## 2. Estado actual

```
src/mesas/
└── mesas.module.ts    # @Module({}) — vacío
```

---

## 3. Estructura objetivo

```
src/mesas/
├── mesas.module.ts
├── mesas.controller.ts
├── mesas.service.ts
├── mesas.service.spec.ts
├── dto/
│   ├── create-mesa.dto.ts
│   ├── update-mesa.dto.ts
│   └── mesa-response.dto.ts
├── entities/
│   └── mesa.entity.ts
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
Para evitar ciclos, `pedidos` usa `MesasService`; `mesas` no importa `pedidos`
salvo para verificar pedidos activos, lo que se resuelve con una consulta
puntual o un service exportado.

---

## 7. Tests esperados

- Lista de mesas ordenada por `numero`.
- Transición válida (`libre → ocupada`) actualiza el estado.
- Transición inválida (`pagado`-like) → `400`.
- `POST` con número duplicado → `400`.
- `GET /mesas/{id}` inexistente → `404`.
- e2e de `401` (mozo) y `403` (mozo intentando `POST`).

---

## 8. Referencias

- [`CONTRACT.md`](./CONTRACT.md) · [`DECISIONS.md`](./DECISIONS.md)
- `docs/api-contract.md` §6.2
- `docs/glossary.md` §3.2
