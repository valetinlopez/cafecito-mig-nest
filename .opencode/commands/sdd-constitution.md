---
description: Verifica que una spec o un pedido respete la constitución y el contrato
agent: planner
---

Cargá la skill `sdd` y verificá el pedido contra los seis innegociables de
`docs/constitution.md` (§1, §3, §4, §5, §8, §9) y contra el contrato de API.

Tema o ticket: $ARGUMENTS

## Pasos

1. Leé `docs/constitution.md`, `docs/api-contract.md` y, si aplica, el
   `DECISIONS.md` del módulo.
2. Enumerá cada requisito del pedido y marquélo como compatible o en conflicto.
3. Si hay conflicto:
   - explicá el artículo o la sección del contrato afectada;
   - proponé la alternativa que **no** cambie el contrato;
   - si el cambio de principio es inevitable, redactá el ADR `Propuesto` en
     `docs/adr/` (el planner puede crear ADR nuevos, no editar los aceptados) y
     pedí aprobación humana antes de seguir.
4. Si no hay conflicto, devolvé el visto bueno y el número de spec que
   corresponde crear.

## Reglas

- No edites `docs/constitution.md`, `docs/api-contract.md` ni `docs/openapi.yaml`.
- No implementes ni planifiques todavía.
- No inventes excepciones: si el contrato no cubre el caso, se documenta la
  interpretación y se avisa.

## Salida

```
## Innegociables
| Principio | Estado | Evidencia |
|-----------|--------|-----------|

## Conflictos
<none o lista con artículo/sección>

## ADR
<none o ruta del ADR propuesto>

## Veredicto
COMPATIBLE | REQUIERE ADR | FUERA DE ALCANCE
```
