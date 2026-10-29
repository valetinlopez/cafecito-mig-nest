---
description: Implementa una tarea concreta con test primero y un commit Tn (fase 5)
agent: implementer
---

Cargá la skill `nestjs-esm`. Implementá **una sola** tarea de
`specs/NNN-slug/tasks.md`.

Pedido: $ARGUMENTS

Interpretación: el primer argumento es la spec (`NNN-slug`) y el segundo la tarea
(`T1`). Si solo viene la tarea, usá la spec que corresponda al ticket en curso.

## Pasos

1. Leé la tarea, sus `Depends on` y los RF que cubre.
2. Verificá que las tareas previas estén `[x]`. Si no, frená.
3. Escribí el test y confirmá que falla por la razón correcta.
4. Implementá el mínimo para que pase, respetando capas y convenciones.
5. Corré el gate de la tarea: `npm test -- <modulo>` y, si hay endpoint,
   `npm run test:e2e`.
6. Actualizá la doc del módulo (`README.md`, `CONTRACT.md`, `DECISIONS.md`) si
   el cambio la afecta.
7. Marcá `[x]` en `tasks.md` y commiteá `Tn: <descripción>`.
8. No hagas `git push`.

## Reglas duras

- Un commit por tarea. Sin refactors colaterales.
- No cambies contrato, constitución ni ADR. Si el contrato no se puede cumplir,
  frená y reportá.
- No inventes tablas/columnas: si el esquema no está confirmado, usá lo existente
  y anotá el pendiente en `DECISIONS.md`.
- DTO con `fromEntity()`; imports con `.js`; sin `any`, `console.log` ni `TODO`
  sin ticket.
- Si la tarea revela que la spec está mal: detenete y pedí `/sdd-change`.

## Salida

```
## Tarea
Tn — <título>

## Cambios
- archivo: qué cambió

## Tests
- <test>: rojo → verde
- gate: `npm test -- <modulo>` OK

## Commit
Tn: <descripción>

## Pendiente
<bloqueo o "ninguno">
```
