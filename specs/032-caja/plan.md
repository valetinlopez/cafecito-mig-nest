# Plan — 032-caja

> Fase de planificación sobre [`spec.md`](./spec.md). No agrega requisitos.

## 1. Enfoque

Construir `caja` respetando el contrato existente y mantener pagos como fuente
de movimientos y ventas. La serialización de aperturas se resuelve en una
transacción con advisory transaction lock de PostgreSQL, sin DDL. El cierre
obtiene la caja abierta con `pessimistic_write` dentro de su transacción.

## 2. Archivos y responsabilidades

| Archivo                                        | Acción    | Responsabilidad                                            |
| ---------------------------------------------- | --------- | ---------------------------------------------------------- |
| `src/caja/entities/caja.entity.ts`             | Crear     | Mapeo de tabla `cajas`; transformers compartidos.          |
| `src/caja/dto/caja-apertura.dto.ts`            | Crear     | Request con `monto_inicial` y `@IsNumber`.                 |
| `src/caja/dto/caja-cierre.dto.ts`              | Crear     | Request con `monto_final` y `@IsNumber`.                   |
| `src/caja/dto/caja-response.dto.ts`            | Crear     | Shape de caja y `total_ventas` calculado mediante factory. |
| `src/caja/dto/movimiento-caja-response.dto.ts` | Crear     | Proyección pública del movimiento de pago.                 |
| `src/caja/caja.service.ts`                     | Crear     | Apertura, cierre, caja abierta, historial y consultas.     |
| `src/caja/caja.service.spec.ts`                | Crear     | Reglas de negocio, orden, transacciones y locks.           |
| `src/caja/caja.controller.ts`                  | Crear     | Cinco rutas y acceso admin.                                |
| `src/caja/caja.module.ts`                      | Modificar | Registrar repositorio, PagosModule y exportar CajaService. |
| `src/pagos/pagos.service.ts`                   | Modificar | Movimientos/total agregado para una caja o grupo de cajas. |
| `src/pagos/pagos.service.spec.ts`              | Modificar | Proyecciones, límites temporales y suma con cero.          |
| `test/caja.e2e-spec.ts`                        | Crear     | Contrato HTTP, autenticación, permisos y paths.            |
| Docs caja y `.agents/memory.md`                | Modificar | Estado, decisiones y evidencia MIG-32.                     |

No se modifica `docs/api-contract.md`, `docs/openapi.yaml`, entities de otros
módulos ni se agregan migraciones.

## 3. Contratos internos

- `CajaService.findAbierta(manager?)` devuelve `Caja | null`; opcionalmente
  consulta usando el `EntityManager` recibido para que un consumidor pueda
  participar en la transacción.
- `PagosService` expone una proyección tipada de movimientos con fecha,
  pedido, número de mesa, método, monto y nombre de usuario nullable, así como
  los totales por caja necesarios para serializar caja abierta e historial.
- El DTO de respuesta recibe la caja y el total derivado; no persiste el total.
- `GET /caja/` usa una respuesta HTTP que garantiza JSON literal `null` cuando
  no hay caja abierta.

## 4. Estrategia de transacciones y concurrencia

1. Apertura: iniciar transacción, adquirir advisory transaction lock con una
   clave constante exclusiva para la operación de apertura, consultar con `find`
   si existe caja abierta y, si no, insertar la nueva.
2. Cierre: iniciar transacción, buscar caja abierta con lock
   `pessimistic_write`; si no existe, responder `400`; de lo contrario, guardar
   el monto final, fecha de cierre y estado `cerrada`.
3. Agregados: consultas de sumatoria normalizan resultado nulo a `0` y salida
   `number`. El historial debe evitar una consulta individual por caja.
4. Movimientos: consulta pagada/caja validada; join/proyección en base de datos
   de pedido/mesa/usuario, orden descendente por fecha.

## 5. Estrategia de tests

| RF                     | Nivel          | Evidencia esperada                                                       |
| ---------------------- | -------------- | ------------------------------------------------------------------------ |
| RF-01, RF-02, RF-09    | Unitario       | Apertura y serialización en transacción; solo una inserción concurrente. |
| RF-03, RF-04           | Unitario + E2E | Caja actual, JSON literal null, historial y total calculado.             |
| RF-05, RF-06           | Unitario + E2E | Join/proyección, orden DESC, usuario nullable y 404.                     |
| RF-07, RF-08, RF-10    | Unitario       | Lock `pessimistic_write`, cierre correcto y caja ausente.                |
| RF-11..RF-13           | E2E            | 422 de validación y 401/403 de seguridad.                                |
| RNF-02, RNF-04, RNF-06 | E2E            | Shape, fecha UTC, montos número, barra final y consulta sin N+1.         |

Los tests unitarios usan los helpers de `test/utils/`, mockean la transacción y
verifican los parámetros de lock. E2E no usa PostgreSQL. No se ejecutan DDL ni
consultas contra producción.

## 6. Riesgos

| Riesgo                            | Mitigación                                                           |
| --------------------------------- | -------------------------------------------------------------------- |
| Mapeo distinto al esquema real    | Cotejar evidencia de solo lectura y detenerse si no está disponible. |
| Dos aperturas concurrentes        | Advisory transaction lock, probado con transacción.                  |
| Pago sin usuario histórico        | `usuario_nombre` nullable en DTO.                                    |
| Agregado `SUM` como string o null | Normalizar a número y cero en la capa de pagos.                      |
| Respuesta null vacía en Nest      | E2E verifica cuerpo JSON literal.                                    |
| Historial con consulta N+1        | Totales agrupados por lote.                                          |
