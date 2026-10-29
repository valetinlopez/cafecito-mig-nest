# Plan — 033-cobro

> Fase 3 sobre [`spec.md`](./spec.md). Este documento describe **cómo**; no
> agrega requisitos.

---

## 1. Enfoque

El cobro es **una transacción** en `PedidosService`, porque `pedidos` es el dueño
de la regla (pagos D-04, pedidos D-07):

1. Abrir transacción y bloquear el pedido (`pessimistic_write`).
2. Validar existencia, estado `entregado` y ausencia de pago previo.
3. Resolver la caja abierta y bloquearla.
4. Insertar el `Pago` con `monto = pedido.total` y el usuario del token.
5. Marcar el pedido `pagado`.
6. Liberar la mesa (`libre`).
7. Releer el pedido con `mesa`, `usuario` y `detalles` y devolver el DTO.

Cualquier falla revierte los tres pasos de escritura. `PagosService` no abre
transacción propia: recibe el `EntityManager` de la transacción del cobro.

---

## 2. Archivos

| Archivo                                        | Acción   | Responsabilidad                                                        |
| ---------------------------------------------- | -------- | ---------------------------------------------------------------------- |
| `src/pedidos/dto/pedido-pago.dto.ts`           | crear    | `metodo_pago` validado contra `METODOS_PAGO`; mensaje en español.       |
| `src/pedidos/pedidos.service.ts`               | crear    | `cobrarPedido()`: transacción, validaciones y coordinación.             |
| `src/pedidos/pedidos.controller.ts`            | crear    | `POST /pedidos/:id/pago`, `@Roles('admin')`, `@ApiOperation` estable.   |
| `src/pedidos/pedidos.module.ts`                | modificar| `TypeOrmModule.forFeature([Pedido, DetallePedido])` + imports.          |
| `src/pedidos/pedidos.service.spec.ts`          | crear    | Casos de negocio, rollback, lock y unique.                              |
| `src/pedidos/dto/pedido-pago.dto.spec.ts`      | crear    | Enum cerrado y `422`.                                                   |
| `src/pagos/pagos.service.ts`                   | modificar| `registrarPago(manager, input)` persiste con el manager del cobro.      |
| `src/pagos/pagos.service.spec.ts`              | modificar| Verifica `manager.save` y mapeo a DTO.                                  |
| `src/pagos/DECISIONS.md`                       | modificar| D-12: firma con `EntityManager` reemplaza el `501` de D-11.             |
| `test/pedidos.e2e-spec.ts`                     | crear    | `200` + shape, `401`, `403`, `404`, `400`, `422`, con/sin barra.        |
| `src/pedidos/README.md`, `CONTRACT.md`         | modificar| Estado implementado y errores reales.                                   |

No se toca `docs/api-contract.md`, `docs/openapi.yaml` ni entities.

---

## 3. Contratos internos

### `PagosService.registrarPago`

```ts
async registrarPago(
  manager: EntityManager,
  input: RegistrarPagoInput,
): Promise<PagoResponseDto>;

interface RegistrarPagoInput {
  pedidoId: number;
  cajaId: number;
  usuarioId: number;
  monto: number;
  metodoPago: MetodoPago;
}
```

- `monto` lo calcula `PedidosService` desde `pedido.total` (pagos D-03).
- `cajaId` y `usuarioId` los resuelve el cobro, nunca el request.
- `findByPedido(id)` se implementa en MIG-33 para prevalidar el cobro.
  `findByCaja(id)` pertenece a MIG-32 (movimientos de caja) y no se toca acá.

### `CajaService.findAbierta(manager?)`

- Devuelve `Caja | null`; el cobro responde `400` si es `null`.
- Con `manager`, participa de la transacción y se bloquea la fila.
- Si MIG-32 no expone el método con `manager`, el cobro lo resuelve con el
  repositorio de caja dentro del manager y se anota en `DECISIONS.md`.

### Efecto sobre la mesa

- `manager.update(Mesa, pedido.mesaId, { estado: 'libre' })` dentro de la
  transacción. No se importa `PedidosModule` desde `mesas` (sin `forwardRef`).

---

## 4. Orden de la transacción

```ts
await this.dataSource.transaction(async (manager) => {
  const pedido = await manager.findOne(Pedido, {
    where: { id },
    relations: { mesa: true, detalles: true },
    lock: { mode: 'pessimistic_write' },
  });

  if (!pedido) throw new NotFoundException('Pedido no encontrado');
  if (pedido.estado !== 'entregado') throw new BadRequestException(...);

  const pagoPrevio = await this.pagosService.findByPedido(id, manager);
  if (pagoPrevio) throw new BadRequestException(...);   // F-05

  const caja = await this.cajaService.findAbierta(manager);
  if (!caja) throw new BadRequestException('No se puede cobrar un pedido sin una caja abierta');

  await this.pagosService.registrarPago(manager, {
    pedidoId: pedido.id,
    cajaId: caja.id,
    usuarioId: usuario.id,
    monto: pedido.total,
    metodoPago: dto.metodoPago,
  });

  await manager.update(Pedido, pedido.id, { estado: 'pagado' });
  await manager.update(Mesa, pedido.mesaId, { estado: 'libre' });

  return manager.findOneOrFail(Pedido, {
    where: { id: pedido.id },
    relations: { mesa: true, usuario: true, detalles: true },
  });
});
```

Notas:

- El lock del pedido serializa los cobros concurrentes (RF-09).
- El `UNIQUE` de `pagos.pedido_id` es la última barrera; la violación
  PostgreSQL `23505` se traduce a `400` (F-05).
- No se escribe `cajas.total_ventas` (caja D-02).

---

## 5. Estrategia de test

| RF          | Nivel    | Test propuesto                                                        |
| ----------- | -------- | --------------------------------------------------------------------- |
| RF-01, RF-11 | unitario | `cobra un pedido entregado y devuelve el DTO en estado pagado`        |
| RF-02       | unitario | `responde 404 si el pedido no existe`                                  |
| RF-03       | unitario | `rechaza el cobro si el pedido no está entregado` (tabla de estados)   |
| RF-04       | unitario | `rechaza el cobro si no hay caja abierta`                              |
| RF-05       | unitario | `rechaza un método de pago fuera del enum` (DTO)                       |
| RF-06       | unitario | `registra el pago por el total del pedido y el usuario autenticado`    |
| RF-07       | unitario | `marca el pedido pagado y libera la mesa`                              |
| RF-08       | unitario | `revierte las tres escrituras si falla la liberación de la mesa`       |
| RF-09       | unitario | `bloquea el pedido con pessimistic_write` + unique `23505` → `400`     |
| RF-10       | e2e      | `401` sin token, `403` con rol `mozo`                                 |
| RNF-01..04  | e2e      | `200`, shape, `snake_case`, `total` number, `fecha` con `Z`            |

- Los unitarios usan `test/utils/` y mockean `DataSource.transaction` para
  ejecutar el callback con un `manager` mockeado; se verifica el orden de las
  llamadas y que el rollback ocurra.
- El e2e del controller usa el service mockeado (patrón de
  `test/categorias.e2e-spec.ts`), sin PostgreSQL.
- El rollback real se cubre con un test de integración detrás de
  `E2E_DATABASE=true`, cuando MIG-44 confirme el esquema.

---

## 6. Dependencias y orden

| Precondición | Ticket | Estado | Efecto si falta                                   |
| ------------ | ------ | ------ | ------------------------------------------------- |
| Entities `Pedido` y `DetallePedido` | MIG-30 | En curso | No hay repositorio ni relaciones que usar.       |
| Módulo `caja` con `findAbierta`      | MIG-32 | Por hacer | Se resuelve con el repositorio dentro del manager. |
| Esquema real de `pagos` y `cajas`    | MIG-44 | Por hacer | Nulabilidad y FKs sin confirmar.                 |

Por eso el plan se puede escribir hoy, pero la implementación arranca cuando
MIG-30 esté mergeado. Las tareas T2 y T4 quedan marcadas como bloqueadas hasta
entonces.

---

## 7. Riesgos

| Riesgo                                                        | Mitigación                                                          |
| ------------------------------------------------------------- | ------------------------------------------------------------------- |
| Dos cobros concurrentes (condición de carrera)                | Lock `pessimistic_write` sobre el pedido + `UNIQUE` en `pedido_id`.  |
| Escritura parcial entre pago, pedido y mesa                   | Una sola transacción; test de rollback con falla inyectada.          |
| `Pago` histórico con pedido `entregado` (dato inconsistente)  | Prevalidación `findByPedido` + traducción de `23505` a `400`.        |
| N+1 al armar la respuesta                                     | Relectura única con `relations` explícitas.                          |
| Entidades provisionales hasta MIG-44                          | No se agregan columnas ni relaciones nuevas; mapeo con lo existente. |
| `total = 0` permitido (S-04)                                  | Supuesto documentado; producto confirma o se abre spec nueva.        |

---

## 8. Fuera de alcance (recordatorio)

Crear pedidos, `PATCH` de estados, apertura/cierre de caja, movimientos,
reportes y cobros parciales.
