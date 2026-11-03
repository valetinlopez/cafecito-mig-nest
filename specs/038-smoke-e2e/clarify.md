# Clarify — 038-smoke-e2e

> Ambigüedades detectadas antes de implementar. Las marcadas "Humano" se
> resolvieron en la conversación de inicio del ticket.

| #    | Ambigüedad detectada                                                                                  | Resolución                                                                                                                         | Registro |
| ---- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------- |
| C-01 | El ticket pide "las 12 mesas del seed", pero no existe seed (MIG-39) ni PostgreSQL en CI ni en local.  | Humano: prueba automática con base simulada + guía manual para la base real. MIG-38 no depende de MIG-39.                          | Spec §8  |
| C-02 | Con services simulados, "stock descontado" o "mesa ocupada" no se prueban de verdad.                   | Se simula solo la persistencia: los services reales aplican esas reglas. SQL, agregaciones, bloqueos y rollback van a la guía manual. | Spec §8  |
| C-03 | El `DELETE /productos/{id}` faltante es de MIG-29, no de MIG-38.                                       | Humano: se corrige en esta rama y spec.                                                                                            | Spec §8  |
| C-04 | ¿Cómo se detectan "pedidos asociados"? El legacy dependía de la violación de FK.                       | Chequeo explícito previo + traducción de la violación de FK como red ante carreras. Detalle en el plan.                           | Plan §4  |
| C-05 | "Status codes coinciden con `lib/api.ts`": el cliente solo mira `res.ok`.                              | Se verifican los status del contrato; ninguna diferencia 200/201 rompería al frontend.                                            | Spec §8  |
| C-06 | "Mensajes en español como los que muestra el frontend": el frontend muestra el `detail` tal cual.      | Se verifica `detail` string no vacío en todo error y el texto exacto donde el contrato lo fija.                                   | RF-06    |
| C-07 | "Fechas: se muestran con la hora correcta" es un criterio visual.                                      | La prueba automática verifica ISO UTC con `Z` (ADR 0007); el chequeo visual va a la guía manual.                                   | RF-04/08 |
| C-08 | El ticket habla de "todos los endpoints"; el contrato tiene 32 y el frontend consume 28.               | Se prueban los 28 consumidos; los otros 4 ya tienen e2e propio.                                                                    | Spec §2  |
| C-09 | Los tipos del frontend pueden cambiar después de esta prueba.                                          | Los shapes citan el commit de origen; si el frontend cambia, se actualiza la copia en el mismo PR.                                | RNF-02   |

## Preguntas abiertas

Ninguna.
