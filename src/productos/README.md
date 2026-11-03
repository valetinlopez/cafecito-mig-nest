# Módulo `productos`

| Campo        | Valor                                                |
| ------------ | ---------------------------------------------------- |
| Estado       | **Implementado**: GET/POST/PATCH (MIG-29), DELETE (MIG-38) |
| Entity       | `Producto` → tabla `productos` (mapeo por validar en MIG-44) |
| Endpoints    | 5 implementados                                      |
| Dependencias | `categorias`, `common/guards`; `DetallePedido` por adapter de lectura |
| Tests        | Unitarios y e2e de los 5 endpoints                   |

---

## 1. Responsabilidad

Catálogo de productos: precio, stock, disponibilidad y categoría. Es la fuente
de datos de `pedidos` para calcular subtotales y descontar stock.

---

## 2. Estado actual

GET colección/detalle, POST, PATCH y DELETE están implementados. La relación ORM
de categoría y el transformer numérico compartido esperan MIG-44.
Mientras tanto, `categoria_id` es scalar, `CategoriasService` hidrata el objeto
anidado y el response DTO convierte temporalmente `precio` a `number`.

---

## 3. Estructura objetivo

```
src/productos/
├── productos.module.ts
├── productos.controller.ts
├── productos.service.ts
├── productos.service.spec.ts
├── product-usage.port.ts              # ¿el producto figura en algún pedido?
├── detalle-pedido-usage.adapter.ts    # implementación sin importar PedidosModule
├── detalle-pedido-usage.adapter.spec.ts
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
| `descripcion` | `descripcion`  | `varchar`/`text` | nullable (tipo físico por validar en MIG-44) |
| `precio`      | `precio`       | `numeric(10,2)`  | `> 0`, conversión temporal en response DTO |
| `stock`       | `stock`        | `int`            | `>= 0`, default 0             |
| `stockMinimo` | `stock_minimo` | `int`            | `>= 0`, default 5             |
| `disponible`  | `disponible`   | `boolean`        | default `true`                |
| `categoriaId` | `categoria_id` | `int`            | scalar; validar contra esquema en MIG-44 |
| `categoria`   | —              | propiedad DTO hidratada | sin relación ORM hasta MIG-44 |

---

## 5. Reglas de negocio

- `precio > 0`; `stock >= 0`; `stock_minimo >= 0`; `nombre` mínimo 1.
- `categoria_id` debe existir → `400` `La categoría indicada no existe`.
- `DELETE` solo borra productos que no figuran en ningún pedido; si figuran,
  responde `400` y hay que marcarlos como no disponibles (D-08).
- El stock se descuenta desde `pedidos`, no desde `productos`.
- `disponible = false` oculta el producto del alta de pedidos sin borrar
  historial.

---

## 6. Dependencias

```
  categorias (service lookup)  →  productos (entity + service)  →  pedidos
```

- `categoria_id` se valida e hidrata mediante `CategoriasService`; relación ORM
  postergada hasta validar esquema y transformer en MIG-44.
- `pedidos` consume `ProductosService` para validar disponibilidad y stock.

---

## 7. Tests esperados

- Lista ordenada por nombre con categoría anidada y `precio` numérico.
- Lista vacía.
- Alta con categoría inexistente → `400`.
- Alta con `precio <= 0` → `422`.
- `DELETE`: borra sin uso, `400` con uso o violación de FK, `404` inexistente.
- e2e de `403` con rol `mozo` en `POST`/`PATCH`/`DELETE`.

---

## 8. Referencias

- [`CONTRACT.md`](./CONTRACT.md) · [`DECISIONS.md`](./DECISIONS.md)
- `docs/api-contract.md` §6.3
- `docs/adr/0004-decimales-number.md`
