# Clarify — 033-cobro

> Revisión de la fase 2 sobre [`spec.md`](./spec.md). Solo detección: no se
> proponen soluciones de implementación.

| #    | Severidad | Ubicación        | Detección                                                                                                 | Pregunta / resolución |
| ---- | --------- | ---------------- | --------------------------------------------------------------------------------------------------------- | --------------------- |
| F-01 | Alta      | §8 S-04          | El contrato no define si un pedido con `total = 0` se puede cobrar. Un `Pago` de `0.00` entra al arqueo.  | ¿Producto permite cobrar total cero? Queda como supuesto explícito y seguimiento; no bloquea el plan. |
| F-02 | Alta      | RF-09            | El contrato define el `400` por estado, pero no el mensaje del segundo cobro concurrente. Sin bloqueo, dos requests leen `entregado` y ambas intentan insertar. | El segundo debe recibir el `400` de estado porque el pedido ya está `pagado`. Requiere lock pesimista. |
| F-03 | Media     | RF-11 / RNF-06   | El shape `Pedido` incluye `mesa`, `usuario` y `detalles`; no está dicho si se releen dentro o fuera de la transacción. | Se releen dentro, después de las escrituras, para no devolver un estado previo al commit. |
| F-04 | Media     | §8 S-05          | La spec no valida el estado previo de la mesa; si está `en_limpieza` por un dato inconsistente, el cobro la fuerza a `libre`. | El contrato no pide validarlo. Se acepta el efecto y se registra como riesgo. |
| F-05 | Media     | §6 "Doble clic"  | Puede existir un `Pago` previo con el pedido todavía `entregado` (inconsistencia histórica). El `UNIQUE` lo detecta, pero el contrato no tipa ese error. | Se traduce a `400` con el mensaje de estado y se documenta en `DECISIONS.md` al implementar. |
| F-06 | Baja      | RF-05            | No está dicho si el enum es case-sensitive. `EFECTIVO` podría aceptarse por error.                         | El enum es cerrado y en minúsculas: `EFECTIVO` → `422`. |
| F-07 | Baja      | §2               | "Actualización de `total_ventas`" está fuera de alcance, pero un lector podría esperar que el cobro sume a la caja. | Ratificado: `total_ventas` es derivado (caja D-02); no se toca en el cobro. |

## Estado

- Abiertos con severidad **Alta**: 0 (F-01 queda como supuesto aprobado con
  seguimiento de producto; F-02 se resuelve con el lock en la fase 3).
- Riesgos aceptados y documentados: F-04, F-05.
- `[NECESITA ACLARACIÓN]` pendientes de humano: 1 (S-04, total cero).

## Veredicto de la fase 2

`SPEC LISTA` — los requisitos son verificables y el único punto abierto es una
regla de negocio que no bloquea la implementación por defecto.

**Siguiente:** `/sdd-plan 033-cobro`.
