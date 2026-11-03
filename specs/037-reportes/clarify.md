# Clarify — 037-reportes

> Ambigüedades detectadas antes de implementar. Todas resueltas con el contrato
> y el ticket; ninguna queda bloqueante.

| #    | Ambigüedad detectada                                                                 | Resolución                                                                                                  | Registro |
| ---- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- | -------- |
| C-01 | `ticket_promedio`: el ticket dice `/cobros`, el README previo decía `/pedidos_cobrados`. | Se divide por `cantidad_cobros`. El ejemplo del contrato (`125000 / 84 = 1488.1`) confirma el denominador. | D-04 |
| C-02 | "WHERE pagado": ¿`pedidos.estado = 'pagado'` o existencia de un pago en el rango?     | El eje es `pagos.fecha`: un pedido es vendido en el período si tiene un cobro dentro de él.                  | D-08 |
| C-03 | Top de productos: el ticket fija `LIMIT 20`; D-07 decía "sin límite explícito".        | Se limita a 20, como el legacy y el ticket.                                                                 | D-07 |
| C-04 | `ventas_efectivo` de una caja: ¿solo el período o toda la vida de la caja?             | Toda la vida de la caja: es el insumo de la conciliación de cierre (`diferencia`).                          | D-05 |
| C-05 | Orden de `cajas`: el contrato no lo define.                                            | `fecha_apertura ASC`, desempate por `id ASC`, para lectura cronológica estable.                              | D-09 |
| C-06 | Redondeo de importes derivados (`ticket_promedio`, `diferencia`).                       | Dos decimales, igual que `numeric(10,2)`; evita ruido de coma flotante.                                      | D-10 |
| C-07 | Zona horaria del período: el contrato no la fija.                                      | `America/Argentina/Buenos_Aires`, la misma decisión que `dashboard` (D-03).                                  | D-01 |
| C-08 | ¿`desde > hasta` es `400` o `422`?                                                      | `400` de negocio con el `detail` exacto del contrato; el formato inválido sigue siendo `422`.                | D-11 |
| C-09 | ¿Se expone `total_ventas` por caja, que menciona el ticket?                             | No: el contrato no lo define y el contrato manda. Solo se expone `ventas_efectivo`.                          | D-05 |

## Preguntas abiertas

Ninguna. La implementación puede avanzar sin aclaraciones del humano.
