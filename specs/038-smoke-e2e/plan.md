# Plan — 038-smoke-e2e

## 1. Enfoque

Tres entregables independientes en la misma rama:

1. **Eliminación de productos** (RF-09..12): se hace primero porque la prueba de
   compatibilidad la necesita para cubrir `productoStore` completo.
2. **Prueba de compatibilidad** (RF-01..07, RF-13, RF-14): un e2e nuevo que
   levanta el `AppModule` real y reemplaza **solo el `DataSource`** por un
   almacén en memoria con los datos del seed del legacy. Se ejecutan de verdad
   módulos, guards, pipes, filtro de errores, services y DTOs.
3. **Guía manual** (RF-08): pasos con `curl` y resultado esperado, para correr
   contra una base real cuando estén MIG-39/MIG-44.

## 2. Archivos

| Archivo                                         | Cambio                                                              |
| ----------------------------------------------- | ------------------------------------------------------------------- |
| `src/productos/product-usage.port.ts`           | Nuevo: port "¿el producto figura en algún pedido?"                  |
| `src/productos/detalle-pedido-usage.adapter.ts` | Nuevo: implementación sobre el repositorio de `DetallePedido`      |
| `src/productos/detalle-pedido-usage.adapter.spec.ts` | Nuevo: consulta mínima y resultado booleano                    |
| `src/productos/productos.module.ts`             | Registra `DetallePedido` y el adapter                               |
| `src/productos/productos.service.ts`            | Nuevo `remove(id)`                                                  |
| `src/productos/productos.service.spec.ts`       | Casos de `remove`                                                   |
| `src/productos/productos.controller.ts`         | `DELETE :id` con `204`, admin                                       |
| `test/productos.e2e-spec.ts`                    | e2e de `DELETE`: 204 sin body, 400, 404, 401, 403                    |
| `test/utils/frontend-shapes.ts`                 | Nuevo: shapes de `frontend/types/api.ts` + `expectFrontendShape()`  |
| `test/utils/frontend-shapes.spec.ts`            | Nuevo: el helper detecta faltantes, extras y tipos incorrectos      |
| `test/utils/in-memory-data-source.ts`           | Nuevo: doble del `DataSource`; almacén sin lógica de negocio        |
| `test/utils/in-memory-data-source.spec.ts`      | Nuevo: filtros, orden, cascada, relaciones y consultas sin resolver |
| `test/utils/frontend-compat.fixtures.ts`        | Nuevo: datos del seed legacy y resolvers de las agregaciones        |
| `test/frontend-compat.e2e-spec.ts`              | Nuevo: 28 endpoints, errores, barra final y secuencia del flujo     |
| `docs/workflows/smoke-manual.md`                | Nuevo: guía del flujo contra base real                              |
| `src/productos/{AGENTS,README,CONTRACT,DECISIONS}.md` | `DELETE` implementado y decisión D-08                         |
| `docs/architecture.md`, `test/README.md`        | Estado de productos y nuevo helper                                  |
| `specs/038-smoke-e2e/*`, `specs/README.md`, `.agents/memory.md` | Ciclo SDD y estado                                  |

## 3. Orden de implementación

1. Port + adapter de uso de productos → `remove()` en el service → endpoint + e2e.
2. Helper de shapes con su propio test (para no confiar en un verificador sin probar).
3. e2e de compatibilidad, por grupos de stores.
4. Errores transversales y barra final.
5. Guía manual.
6. Documentación y veredicto.

## 4. Decisiones de diseño

### 4.1 Pedidos asociados sin ciclo de DI

`pedidos` ya depende de `productos` (valida stock y precio). Si `productos`
importara `PedidosModule` habría un ciclo. Se repite el patrón ya aceptado en
`mesas` (`ActiveOrdersPort` + `PedidoActiveOrdersAdapter`, `docs/architecture.md`
§ adapters anti-ciclo): `productos` define un port y un adapter de solo lectura
que registra la entity `DetallePedido`, sin importar el módulo.

### 4.2 Chequeo explícito + red de FK

1. `findOneBy({ id })` → si no existe, `404`.
2. El adapter consulta si existe algún `detalle_pedidos` con ese `producto_id`
   (cualquier estado de pedido) → si existe, `400`.
3. `delete({ id })`. Si igual falla por violación de FK (`23503`, una venta
   entre el paso 2 y el 3), se traduce al mismo `400`.

El chequeo explícito no depende de que la FK exista en la base (su mapeo es
provisional hasta MIG-44); la traducción de `23503` evita el `500` ante
carreras. Es el mismo comportamiento observable que el legacy.

### 4.3 Shapes del frontend

`types/api.ts` son interfaces de TypeScript: no existen en runtime. Se copian
como objetos descriptores (`{ campo: 'number' | 'string' | 'boolean' | 'iso' |
'null|iso' | enum | shape anidado | array }`) y `expectFrontendShape()` compara
el **conjunto exacto** de claves y el tipo de cada valor. Sin dependencias
nuevas (no hay `zod`/`ajv` en el proyecto).

### 4.4 Simular solo la persistencia

La primera versión de este plan simulaba los services. Se descartó: casi todos
devuelven el DTO ya armado, así que el test habría comparado el doble contra sí
mismo. En su lugar:

- `AppModule` real, con `overrideProvider(getDataSourceToken())`. Prueba además
  que el grafo de módulos resuelve, cosa que ningún e2e hacía hasta ahora.
- El doble guarda, filtra y ordena filas; no conoce reglas de negocio. Devuelve
  copias, así que un cambio sin `save()` no persiste, como en la base real.
- Las agregaciones de `createQueryBuilder` no se pueden ejecutar: las resuelven
  funciones del fixture, con clave `<alias>:<primer campo>`, y devuelven strings
  como el driver de `pg`. Una consulta sin resolver hace fallar el test.
- Los datos son los del seed legacy (2 usuarios, 4 categorías, 10 productos, 12
  mesas), con `precio` como string, igual que `numeric` en `pg`.

## 5. Riesgos y mitigaciones

| Riesgo                                                         | Mitigación                                                               |
| -------------------------------------------------------------- | ------------------------------------------------------------------------ |
| El doble se comporta distinto que TypeORM                      | Tests propios del doble; un operador o consulta desconocidos fallan.     |
| La copia de los shapes se desactualiza respecto del frontend   | Commit de origen citado en el archivo y en `test/README.md`.             |
| La prueba pasa porque el doble devuelve lo que se espera       | Services y DTOs reales producen la respuesta; el doble solo guarda filas. |
| `DELETE` concurrente con una venta                             | Traducción de `23503` a `400` con test unitario.                         |
| Falsa sensación de "flujo probado"                             | `validate.md` separa lo verificado (HTTP) de lo pendiente (base real).   |

## 6. Estrategia de test

- **Unitarios**: adapter (consulta y booleano), `remove()` (borra, 404, 400 por
  uso, 400 por `23503`, otro error de base se propaga), helper de shapes.
- **e2e productos**: `DELETE` 204 sin body, 400, 404, 401, 403.
- **e2e compatibilidad**: arranque del `AppModule`, 28 endpoints con shape
  exacto, errores por store, barra final con y sin, secuencia del flujo con
  status del contrato y efectos sobre stock, mesa y pago.

## 7. Fuera del plan

- No se toca `docs/api-contract.md`, `docs/openapi.yaml`, la constitución ni ADRs.
- No se agregan dependencias ni migraciones.
- No se modifica el frontend.
