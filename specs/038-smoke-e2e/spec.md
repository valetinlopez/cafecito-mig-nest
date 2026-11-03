# Spec 038 — Smoke E2E y compatibilidad con el frontend

| Campo   | Valor                                                                                   |
| ------- | --------------------------------------------------------------------------------------- |
| Ticket  | MIG-38                                                                                  |
| Epic    | MIG-9 — E9: Testing & QA                                                                |
| Estado  | Implementada; revisión humana pendiente                                                 |
| Alcance | Probar que el frontend funciona sin cambios contra el backend NestJS y cerrar el `DELETE` faltante. |

## 1. Contexto

El backend NestJS reemplaza al FastAPI sin que el frontend cambie. Cada módulo
se probó por separado, pero nunca se verificó que la aplicación completa
responda **exactamente** lo que consumen los nueve stores del frontend
(`grupo1/frontend`), ni que el flujo de negocio de punta a punta funcione.

El relevamiento previo encontró un breaking change: el frontend elimina
productos (`productoStore.eliminarProducto`) y el backend NestJS no expone esa
operación, por lo que la pantalla de productos falla con `404`.

No hay una base disponible en CI ni el seed de MIG-39. La prueba automática
ejecuta la aplicación real (módulos, guards, services y DTOs) simulando solo la
persistencia, así que las reglas de negocio del flujo se ejecutan de verdad. Lo
que depende de PostgreSQL (SQL, agregaciones, bloqueos, rollback, mapeo de
columnas) se verifica con una guía manual reproducible y queda pendiente de
ejecución contra una base real.

## 2. Fuera de alcance

- Ejecutar el flujo contra PostgreSQL o Neon (queda la guía para hacerlo).
- El seed de datos (MIG-39) y la validación del esquema real (MIG-44).
- Modificar el frontend, el contrato global, la constitución o un ADR aceptado.
- QA visual de las pantallas del frontend.
- Endpoints que el frontend no consume (`POST /auth/register`,
  `GET /mesas/{id}`, `GET /productos/{id}`, `GET /pedidos/{id}`): ya tienen e2e
  propio.
- Borrado lógico de productos o borrado en cascada de su historial.

## 3. Historias de usuario

**Como** equipo de migración, **quiero** una prueba automática que recorra todo
lo que consume el frontend sobre la aplicación completa, **para** hacer el
cutover sabiendo que ninguna pantalla se rompe.

**Como** administrador, **quiero** eliminar un producto que nunca se vendió,
**para** depurar el catálogo sin perder el historial de ventas.

## 4. Requisitos funcionales

### A. Compatibilidad con el frontend (automática)

- **RF-01** CUANDO el frontend llama a cualquiera de los 28 endpoints que
  consumen sus stores, con la misma ruta que usa (incluida la barra final),
  EL SISTEMA DEBE responder con éxito sin redirección, con todos los módulos
  registrados en la misma aplicación.
- **RF-02** CUANDO EL SISTEMA responde con éxito a esos endpoints, DEBE
  devolver exactamente los campos del tipo que declara `frontend/types/api.ts`
  para esa llamada: sin campos faltantes, sin campos extra y con el tipo JSON
  esperado.
- **RF-03** EL SISTEMA DEBE serializar todo importe (precios, totales,
  subtotales, montos) como JSON `number`.
- **RF-04** EL SISTEMA DEBE serializar toda fecha como ISO-8601 UTC terminada en
  `Z`, o `null` donde el tipo del frontend lo admite.
- **RF-05** MIENTRAS no exista una caja abierta, EL SISTEMA DEBE responder a la
  consulta de la caja actual con el literal JSON `null`.
- **RF-06** SI una llamada falla por autenticación, permisos, recurso
  inexistente, validación o regla de negocio, ENTONCES EL SISTEMA DEBE
  responder `401`, `403`, `404`, `422` o `400` respectivamente, con el cuerpo
  `{ "detail": "<mensaje en español>" }`.
- **RF-07** CUANDO se recorre la secuencia del flujo de negocio (login, mesas,
  pedido, estados, caja, cobro, movimientos, cierre, dashboard y reportes), EL
  SISTEMA DEBE responder cada paso con el status del contrato.
- **RF-13** CUANDO se crea un pedido, avanza de estado y se cobra, EL SISTEMA
  DEBE descontar el stock, llevar la mesa a `ocupada`, luego a `pendiente_cobro`
  y finalmente a `libre`, y registrar un pago por el total del pedido.
- **RF-14** EL SISTEMA DEBE poder arrancar con todos sus módulos reales juntos,
  sin dependencias sin resolver ni ciclos.
- **RF-15** CUANDO un usuario inicia sesión, EL SISTEMA DEBE emitir un token con
  los claims `sub`, `rol` y `exp`, porque el frontend los decodifica para decidir
  las redirecciones de pantalla.

### B. Flujo contra base real (manual)

- **RF-08** EL SISTEMA DEBE contar con una guía reproducible que recorra los
  siete pasos del flujo del ticket contra una base real, con el comando y el
  resultado esperado de cada paso.

### C. Eliminación de productos (breaking change)

- **RF-09** CUANDO un administrador elimina un producto que no figura en ningún
  pedido, EL SISTEMA DEBE eliminarlo y responder `204` sin cuerpo.
- **RF-10** SI el producto figura en algún pedido, aunque sea histórico,
  ENTONCES EL SISTEMA DEBE conservarlo y responder `400` con
  `No se puede eliminar: el producto tiene pedidos asociados. Marcalo como no disponible en su lugar.`
- **RF-11** SI el producto no existe, ENTONCES EL SISTEMA DEBE responder `404`
  con `Producto no encontrado`.
- **RF-12** SI el usuario no tiene rol `admin`, ENTONCES EL SISTEMA DEBE
  responder `403`; SI no presenta autenticación válida, DEBE responder `401`.

## 5. Requisitos no funcionales

- **RNF-01** La prueba de compatibilidad corre con `npm run test:e2e`, sin
  PostgreSQL ni red, y entra en el CI existente.
- **RNF-02** Los shapes esperados se copian de `grupo1/frontend/types/api.ts`
  citando el commit de origen; no se importan archivos del frontend.
- **RNF-03** No se agregan dependencias.
- **RNF-04** La eliminación no cambia el contrato: path, status y mensajes son
  los de `docs/api-contract.md` §6.3.
- **RNF-05** La verificación de pedidos asociados no introduce dependencias
  circulares entre módulos.

## 6. Casos límite y errores

| Caso                                                        | Resultado                                     |
| ----------------------------------------------------------- | --------------------------------------------- |
| Ruta con barra final (`/mesas/`) y sin ella (`/mesas`)      | Misma respuesta, sin `301`/`307`              |
| Campo opcional del frontend sin valor (`descripcion`)       | `null` explícito, nunca omitido               |
| Caja actual sin caja abierta                                | Body `null`                                   |
| Lista vacía (pedidos activos, movimientos)                  | `[]`                                          |
| `DELETE` de producto vendido solo en un pedido cancelado    | `400`: el historial lo referencia igual       |
| `DELETE` de producto inexistente                            | `404`                                         |
| Venta entre el chequeo y el borrado                         | `400`, nunca `500`                            |
| Dos `DELETE` concurrentes del mismo producto                | El segundo responde `404`                     |
| `DELETE` con rol `mozo`                                     | `403`                                         |

## 7. Criterios de aceptación

- **CA-01** Los 28 endpoints consumidos por los nueve stores responden con el
  shape exacto del frontend (RF-01..RF-05).
- **CA-02** Los errores de cada store respetan `{ "detail" }` y la
  clasificación por status de `normalizeApiError` (RF-06).
- **CA-03** La secuencia del flujo responde con los status del contrato y deja
  stock, mesa y pago en el estado esperado sobre la aplicación real (RF-07,
  RF-13, RF-14).
- **CA-04** La guía manual existe y cualquier integrante puede ejecutarla
  (RF-08).
- **CA-05** El frontend puede eliminar productos sin cambios (RF-09..RF-12).
- **CA-06** Los breaking changes encontrados quedan documentados con su estado.
- **CA-07** `lint`, `typecheck`, unitarios y e2e en verde.

## 8. Supuestos y preguntas abiertas

- Decisión del humano: base simulada + guía manual. La prueba automática simula
  solo la persistencia; no verifica SQL, agregaciones, bloqueos, rollback ni el
  mapeo de columnas. Los valores de dashboard y reportes salen de resolvers
  escritos en el test: se verifica su shape y conversión, no el cálculo SQL.
- El `DELETE` de productos se incorpora a esta spec por pedido explícito del
  humano, aunque el pendiente nació en MIG-29.
- El frontend no valida el status exacto, solo `res.ok`; se verifican igual los
  status del contrato.
- No quedan preguntas que bloqueen la implementación.

## 9. Referencias

- MIG-38 — "Smoke test E2E + verificación compatibilidad frontend".
- `docs/api-contract.md` §6.3 (productos) y §8 (matriz de compatibilidad).
- `grupo1/frontend/types/api.ts`, `lib/api.ts` y `stores/*.ts` (commit `3dfdb1f`).
- `grupo1/backend/app/services/producto_service.py` — `eliminar_producto`.
- ADR 0001, 0002, 0004, 0005 y 0007.
- `src/productos/DECISIONS.md` D-05.
