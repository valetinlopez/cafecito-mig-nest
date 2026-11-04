# 0009 — Las entities siguen al esquema legacy y los pagos se asignan a la caja por período

| Campo       | Valor                                        |
| ----------- | -------------------------------------------- |
| Estado      | Aceptado                                     |
| Fecha       | 2026-11-03                                   |
| Decisores   | Alexis Napoli                                |
| Tags        | base-compartida, typeorm, pagos, caja        |
| Complementa | [ADR 0007](0007-zona-horaria-proceso.md)     |

## Contexto

MIG-44 comparó las entities con una copia de producción (branch de Neon).
`schema:log` propuso 39 cambios. Dos diferencias impiden que el backend funcione
sobre la base real:

1. **`pagos` no tiene `caja_id` ni `usuario_id`, ni una restricción única sobre
   `pedido_id`.** El mapeo provisional de MIG-31 las supuso, y cobro, caja y
   reportes dependen de ellas. El legacy decide a qué caja pertenece un pago por
   su fecha, y obtiene el usuario desde el pedido.
2. **La base no tiene `DEFAULT` en las columnas con valor por defecto.** El legacy
   los asigna desde Python. Nest declara `default` en las entities y omite el
   valor al insertar, así que en la base real `cajas.fecha_apertura`,
   `pedidos.fecha`, `pagos.fecha` y `usuarios.activo` quedarían en `NULL`.

La base sigue compartida con el backend FastAPI hasta el cutover (MIG-42).

## Decisión

1. **El esquema real manda.** Las entities se ajustan a la base, incluidos
   nulabilidad, largos, índices y restricciones. MIG-44 no ejecuta DDL.
2. **Un pago pertenece a una caja si su fecha cae en el período de esa caja:**
   desde `fecha_apertura` hasta `fecha_cierre`, o hasta el momento de la consulta
   si sigue abierta, con ambos límites incluidos. Es la regla del legacy.
3. **`usuario_nombre` de un movimiento es el usuario del pedido,** como en el
   legacy. No se registra quién cobró.
4. **El doble cobro se impide en la aplicación:** bloqueo de la fila del pedido y
   verificación de su estado, dentro de la transacción del cobro.
5. **La aplicación asigna explícitamente todo valor por defecto al insertar.**
   Ninguna entity declara `default` si la columna real no lo tiene.
6. **Las columnas que la base admite como `NULL` y el legacy siempre completa se
   declaran `nullable` en el mapeo y conservan su tipo no nulo en TypeScript.**
   La copia de producción no tiene ningún `NULL` en ellas.

## Alternativas consideradas

| Alternativa                                     | Por qué se descarta                                                                                                                       |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Migración que agrega `caja_id` y `usuario_id`   | El ticket pide corregir entities, no la base. Los pagos históricos y los que cree el legacy quedarían sin caja y los totales no cerrarían. |
| Migración que agrega los `DEFAULT` faltantes    | Toca producción por algo que la aplicación resuelve sola.                                                                                 |
| Calcular el período en memoria                  | Viola Convenciones §6.3: toda agregación se resuelve en la base.                                                                          |
| Mapear `nullable: false` sin alinear la columna | `schema:log` seguiría proponiendo `SET NOT NULL` y la validación de MIG-44 no pasaría.                                                    |

## Consecuencias

**Positivas**

- Los dos backends calculan los mismos totales sobre los mismos datos.
- El cutover y una eventual vuelta atrás no requieren tocar la base.

**Negativas / costos**

- No queda registrado quién cobró cada pago.
- Un pago con la fecha exacta del cierre de una caja y de la apertura de la
  siguiente se contaría en ambas, igual que en el legacy.
- Sin restricción única, la unicidad del pago depende de que todo cobro use la
  transacción con bloqueo.
- Si una fila legacy llegara a tener `NULL` en una de las columnas del punto 6, el
  tipo de TypeScript no lo reflejaría y la serialización de esa fila podría fallar.

**Evolución posible:** después del cutover, sin el legacy escribiendo en la base,
un ticket propio puede agregar estas columnas y restricciones con una migración.

## Referencias

- [`specs/044-esquema-real/spec.md`](../../specs/044-esquema-real/spec.md)
- `docs/api-contract.md` §11: "Movimiento: cobro dentro del período de una caja".
- Constitución, artículos 2 y 4.
- Legacy: `backend/app/services/caja_service.py`, `backend/app/models/*.py`
  (`grupo1`, commit `3dfdb1f`).
- `src/pagos/DECISIONS.md` D-02, D-08, D-09; `src/caja/DECISIONS.md` D-05.
- Tickets MIG-31, MIG-32, MIG-44.
