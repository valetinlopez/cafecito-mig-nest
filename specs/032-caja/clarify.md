# Clarify — 032-caja

## Aclaraciones resueltas desde el ticket y las decisiones del usuario

| Tema                     | Aclaración                                                            |
| ------------------------ | --------------------------------------------------------------------- |
| Alcance                  | Se implementa exclusivamente MIG-32; no se realizan cambios en Jira.  |
| Rutas y shapes           | Se conserva `docs/api-contract.md` §6.6 y su compatibilidad frontend. |
| Total de ventas          | Es una suma calculada de pagos, no una columna de Caja.               |
| Movimientos              | Se derivan de pagos y requieren pedido/mesa/usuario en la proyección. |
| Concurrencia de apertura | El usuario eligió serialización transaccional sin DDL.                |
| Serialización de cierre  | El ticket exige lock pesimista en la fila de caja.                    |

## Puntos para aprobación de la spec

1. “Pagos del período” se implementa como pagos asociados por `caja_id`, en
   línea con `src/caja/DECISIONS.md` D-05; la fecha establece el orden DESC y
   no se agrega un filtro de intervalo no especificado.
2. Se usa el mapeo legacy documentado `numeric(10,2)` y timestamp con
   transformers UTC, sin modificar el esquema; su validación contra producción
   permanece en MIG-44.
3. Las validaciones de montos se limitan a `@IsNumber`, sin reglas adicionales
   no pedidas por el ticket.

La spec queda aprobada con estos criterios a partir del alcance explícito
compartido por el usuario y la documentación del módulo. No se realizan cambios
en Jira.
