# Módulo `productos`

| Campo        | Valor                                                |
| ------------ | ---------------------------------------------------- |
| Estado       | **Scaffold** (módulo registrado, sin código propio)  |
| Entity       | `Producto` → tabla `productos` (por confirmar)       |
| Endpoints    | 5 (ver [`CONTRACT.md`](./CONTRACT.md))               |
| Dependencias | `categorias`, `common/transformers`, `common/guards` |
| Tests        | Pendientes                                           |

---

## 1. Responsabilidad

Catálogo de productos: precio, stock, disponibilidad y categoría. Es la fuente
de datos de `pedidos` para calcular subtotales y descontar stock.

---

## 2. Estado actual

```
src/productos/
└── productos.module.ts    # @Module({}) — vacío
```

---

## 3. Estructura objetivo

```
src/productos/
├── productos.module.ts
├── productos.controller.ts
├── productos.service.ts
├── productos.service.spec.ts
├── dto/
│   ├── create-producto.dto.ts
│   ├── update-producto.dto.ts
│   └── producto-response.dto.ts
├── entities/
│   └── producto.entity.ts
├── README.md · CONTRACT.md · DECISIONS.md
```

---

## 4. Modelo esperado

| Propiedad     | Columna        | Tipo             | Restricción                   |
| ------------- | -------------- | ---------------- | ----------------------------- |
| `id`          | `id`           | `serial`         | PK                            |
| `nombre`      | `nombre`       | `varchar`        | not null                      |
| `descripcion` | `descripcion`  | `varchar`/`text` | nullable                      |
| `precio`      | `precio`       | `numeric(10,2)`  | `> 0`, transformer a `number` |
| `stock`       | `stock`        | `int`            | `>= 0`, default 0             |
| `stockMinimo` | `stock_minimo` | `int`            | `>= 0`, default 5             |
| `disponible`  | `disponible`   | `boolean`        | default `true`                |
| `categoriaId` | `categoria_id` | `int`            | FK a `categorias`             |
| `categoria`   | —              | `ManyToOne`      | solo si existe `Categoria`    |

---

## 5. Reglas de negocio

- `precio > 0`; `stock >= 0`; `stock_minimo >= 0`; `nombre` mínimo 1.
- `categoria_id` debe existir → `400` `La categoría indicada no existe`.
- `DELETE` con pedidos asociados → `400` `No se puede eliminar: el producto
tiene pedidos asociados. Marcalo como no disponible en su lugar.`
- `DELETE` exitoso → `204` sin body.
- El stock se descuenta desde `pedidos`, no desde `productos`.
- `disponible = false` oculta el producto del alta de pedidos sin borrar
  historial.

---

## 6. Dependencias

```
categorias (entity)  →  productos (entity + service)  →  pedidos
```

- `Producto` declara `@ManyToOne(() => Categoria)` cuando la entity exista.
- `pedidos` consume `ProductosService` para validar disponibilidad y stock.

---

## 7. Tests esperados

- Lista ordenada (definir: nombre) con categoría anidada y `precio` numérico.
- Lista vacía.
- Alta con categoría inexistente → `400`.
- Alta con `precio <= 0` → `422`.
- Baja con pedidos asociados → `400`.
- Baja exitosa → `204` sin body.
- e2e de `403` con rol `mozo` en `POST`/`PATCH`/`DELETE`.

---

## 8. Referencias

- [`CONTRACT.md`](./CONTRACT.md) · [`DECISIONS.md`](./DECISIONS.md)
- `docs/api-contract.md` §6.3
- `docs/adr/0004-decimales-number.md`
