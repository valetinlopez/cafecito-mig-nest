---
description: Valida la implementación contra los requisitos y emite veredicto (fase 6)
agent: reviewer
---

Cargá la skill `sdd`. Validá la spec indicada contra el código y los tests.

Spec: $ARGUMENTS

## Pasos

1. Leé `spec.md`, `plan.md`, `tasks.md` y el diff completo (`git diff`, `git log`).
2. Verificá que todas las tareas estén `[x]` y que los commits sean `Tn:`.
3. Corré los cuatro gates:

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
```

4. Armá la matriz **RF → test → resultado**. Un RF sin test es falla **Alta**.
5. Verificá los RNF: status, shape `snake_case`, decimales `number`, fechas
   ISO-8601 `Z`, `null` explícito, `401`/`403`, barra final.
6. Revisá que el diff no incluya cambios de contrato, constitución, ADR ni
   archivos generados.
7. Escribí `specs/$ARGUMENTS/validate.md` con matriz, gates y veredicto.

## Veredictos

| Veredicto            | Cuándo                                              |
| -------------------- | --------------------------------------------------- |
| `APROBADO`           | Todos los RF con evidencia y gates en verde.        |
| `CAMBIOS NECESARIOS` | Fallas concretas de implementación o tests.         |
| `SPEC INCOMPLETA`    | Falta un requisito o una decisión de negocio.       |

Máximo dos vueltas de `CAMBIOS NECESARIOS`. A la tercera, se vuelve a la spec.

## Reglas

- No edites código ni tests. Solo `validate.md` y, si falta, `clarify.md`.
- No apruebes con un gate rojo ni con un RF sin evidencia.
- Cada hallazgo lleva archivo y línea.

## Salida

```
## Matriz
| Requisito | Evidencia | Resultado |

## Gates
lint · typecheck · test · test:e2e

## VEREDICTO: APROBADO | CAMBIOS NECESARIOS | SPEC INCOMPLETA
```
