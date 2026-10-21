# Módulo `categorias`

| Campo        | Valor                                           |
| ------------ | ----------------------------------------------- |
| Estado       | **Implementado (solo lectura)**                 |
| Ticket       | MIG-18 — módulo de referencia                   |
| Entity       | `Categoria` → tabla `categorias`                |
| Endpoints    | `GET /api/v1/categorias/`                       |
| Dependencias | `database` (TypeORM)                            |
| Tests        | `categorias.service.spec.ts` + e2e del contrato |

---

## 1. Responsabilidad

Expone el catálogo de categorías de productos, ordenado alfabéticamente por
nombre. Es el **módulo de referencia** del proyecto: todo módulo nuevo copia su
estructura y su estilo.

Solo lectura: el alta, edición y baja de categorías quedó fuera del alcance en
el legacy y no se migra.

---

## 2. Estructura

```
src/categorias/
├── categorias.module.ts
├── categorias.controller.ts
├── categorias.service.ts
├── categorias.service.spec.ts
├── dto/
│   └── categoria-response.dto.ts
├── entities/
│   └── categoria.entity.ts
├── README.md
├── CONTRACT.md
└── DECISIONS.md
```

---

## 3. Capas

| Archivo                         | Responsabilidad                                                |
| ------------------------------- | -------------------------------------------------------------- |
| `categorias.controller.ts`      | `GET /categorias`, anotaciones Swagger. Sin lógica.            |
| `categorias.service.ts`         | Único acceso al repositorio; ordena en la base y mapea a DTO.  |
| `dto/categoria-response.dto.ts` | Shape público `{ id, nombre }` con `fromEntity()`.             |
| `entities/categoria.entity.ts`  | Mapeo 1 a 1 de `categorias`.                                   |
| `categorias.module.ts`          | Registra `TypeOrmModule.forFeature([Categoria])` y el service. |

---

## 4. Modelo

| Propiedad | Columna  | Tipo          | Restricción                        |
| --------- | -------- | ------------- | ---------------------------------- |
| `id`      | `id`     | `serial`      | PK autoincremental                 |
| `nombre`  | `nombre` | `varchar(50)` | `UNIQUE` (`categorias_nombre_key`) |

---

## 5. Endpoints

| Método | Path                  | Auth   | Éxito                 |
| ------ | --------------------- | ------ | --------------------- |
| `GET`  | `/api/v1/categorias/` | `auth` | `200` · `Categoria[]` |

Detalle y ejemplos en [`CONTRACT.md`](./CONTRACT.md).

---

## 6. Service

| Método               | Retorna                           | Regla                               |
| -------------------- | --------------------------------- | ----------------------------------- |
| `getAllCategorias()` | `Promise<CategoriaResponseDto[]>` | `ORDER BY nombre ASC`, mapeo a DTO. |

---

## 7. Tests

- Unitario: devuelve las categorías ordenadas por nombre; lista vacía; verifica
  la llamada al repositorio con `{ order: { nombre: 'ASC' } }`.
- e2e: `GET /api/v1/categorias` y `/categorias/` → `200`, sin redirect, shape
  `{ id, nombre }`.

---

## 8. Pendientes

| Pendiente                           | Ticket |
| ----------------------------------- | ------ |
| Proteger con `JwtAuthGuard`         | MIG-24 |
| `@OneToMany` hacia `Producto`       | MIG-29 |
| Verificar el esquema contra la base | MIG-44 |

---

## 9. Referencias

- [`CONTRACT.md`](./CONTRACT.md) · [`DECISIONS.md`](./DECISIONS.md)
- `docs/api-contract.md` §6.4
- `docs/conventions.md` §3 y §6
