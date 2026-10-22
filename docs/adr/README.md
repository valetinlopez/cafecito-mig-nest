# Architecture Decision Records (ADR)

Registro de decisiones que afectan a más de un módulo o que son costosas de
revertir. Un ADR **no se edita**: si la decisión cambia, se crea uno nuevo que
lo reemplaza y se marca el anterior como `Reemplazado por NNNN`.

## Índice

| ID   | Título                                                                    | Estado   | Fecha      |
| ---- | ------------------------------------------------------------------------- | -------- | ---------- |
| 0001 | [Validación de DTO con `422`](0001-validacion-422.md)                     | Aceptado | 2026-10-20 |
| 0002 | [Envelope de error `{ detail }`](0002-envelope-error-detail.md)           | Aceptado | 2026-10-20 |
| 0003 | [Fechas ISO-8601 UTC con `Z`](0003-fechas-iso-utc-z.md)                   | Aceptado | 2026-10-20 |
| 0004 | [Decimales como `number` en JSON](0004-decimales-number.md)               | Aceptado | 2026-10-20 |
| 0005 | [Barra final equivalente en colecciones](0005-barra-final-colecciones.md) | Aceptado | 2026-10-20 |
| 0006 | [Vitest como runner único de tests](0006-vitest-runner-tests.md)          | Aceptado | 2026-10-21 |

## Estados posibles

`Propuesto` → `Aceptado` → (`Reemplazado por NNNN` | `Obsoleto`)

## Cómo escribir un ADR

1. Copiá la plantilla de abajo a `docs/adr/NNNN-titulo-en-kebab-case.md`.
2. Usá el siguiente número libre y agregalo al índice.
3. Referencialo desde `docs/architecture.md` y desde el `DECISIONS.md` del
   módulo afectado.
4. Si reemplaza a otro, actualizá el estado del anterior.

### Plantilla

```markdown
# NNNN — Título

| Campo     | Valor      |
| --------- | ---------- |
| Estado    | Propuesto  |
| Fecha     | YYYY-MM-DD |
| Decisores | <equipo>   |
| Tags      | <api, db>  |

## Contexto

<El problema y las restricciones.>

## Decisión

<Qué se decide, en una frase verificable.>

## Alternativas consideradas

| Alternativa | Por qué se descarta |
| ----------- | ------------------- |
| ...         | ...                 |

## Consecuencias

**Positivas**

- ...

**Negativas / costos**

- ...

## Implementación

<Dónde vive en el código y cómo se verifica.>

## Referencias

- `docs/api-contract.md` §X
- <ticket>
```
