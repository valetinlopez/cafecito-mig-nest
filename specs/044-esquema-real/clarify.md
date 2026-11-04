# Clarify — 044-esquema-real

> Ambigüedades detectadas antes de implementar. Las marcadas "Humano" se
> resolvieron en la conversación de inicio del ticket.

| #    | Ambigüedad detectada                                                                                      | Resolución                                                                                                  | Registro  |
| ---- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | --------- |
| C-01 | El ticket asumía pocos ajustes de entities, pero la base no tiene columnas de las que depende la lógica.   | Humano: se adapta el código a la base, con la regla del legacy. Sin migración.                              | ADR 0009  |
| C-02 | `usuario_nombre` del contrato no aclara si es quien tomó el pedido o quien cobró.                          | El legacy usa el usuario del pedido, y la base no guarda otro dato.                                         | RF-05     |
| C-03 | El glosario habla de cobros "dentro de una caja abierta" y el contrato de cobros "dentro del período".     | Son compatibles: el período también aplica a cajas cerradas, y el historial y el endpoint de movimientos las consultan. | RF-01 |
| C-04 | ¿"Sin cambios" en `schema:log` incluye diferencias de forma, como índices redundantes?                     | Sí: el criterio del ticket pide que no proponga cambios.                                                    | RF-12     |
| C-05 | Las columnas admiten `NULL` en la base, pero el código las trata como obligatorias.                        | Se mapean como en la base; la aplicación siempre las completa. Hoy no hay ningún `NULL`.                    | ADR 0009  |
| C-06 | El ticket pide usuarios reales, pero sus contraseñas no pueden pasar por el chat.                          | El desarrollador las escribe en su terminal; el agente solo usa el token resultante.                        | RNF-05    |
| C-07 | La copia tiene una caja abierta y una mesa con cobro pendiente, y la guía supone una base recién sembrada. | La guía crea sus propios datos y parte del estado que encuentre.                                            | RF-18     |
| C-08 | `.agents/memory.md` incluye en MIG-44 el `numericTransformer` de productos; el ticket no lo pide.          | Fuera de alcance: no cambia el esquema ni el comportamiento. Queda anotado como pendiente.                  | Spec §2   |
| C-09 | `nombre` y `descripcion` tienen largo máximo en la base, y los DTOs no lo validan.                         | Fuera de alcance: requiere definir un comportamiento nuevo. Se informa al humano.                           | Spec §2   |

## Preguntas abiertas

Ninguna.
