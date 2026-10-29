---
description: Escribe el plan técnico de una spec aprobada (fase 3)
agent: planner
---

Cargá la skill `sdd`. Escribí el plan técnico de la spec indicada.

Spec: $ARGUMENTS

## Precondición

`specs/$ARGUMENTS/spec.md` existe y `clarify.md` no tiene hallazgos `Alta`
abiertos. Si los tiene, frená y pedí que se resuelvan.

## Pasos

1. Leé `spec.md`, el contrato del recurso y los `DECISIONS.md` de los módulos
   involucrados.
2. Escribí `specs/$ARGUMENTS/plan.md` con:
   - **Enfoque** en 5–10 líneas;
   - **Archivos** a crear o modificar, con su responsabilidad;
   - **Orden** de implementación y dependencias entre tickets;
   - **Transacciones y concurrencia** si aplica;
   - **Estrategia de test** por RF (unitario / e2e);
   - **Riesgos** con mitigación;
   - **Fuera de alcance** repetido en una línea.
3. Verificá que cada RF de la spec tenga al menos un archivo y un test asociado.
   Si no, la spec está incompleta: reportalo.

## Reglas

- El plan es **cómo**, no **qué**: no agregues requisitos ni cambies el alcance.
- Nada de código copiado; pseudocódigo solo si aclara una transacción.
- No edites código ni `tasks.md` en este paso.

## Gate de salida

- Todos los RF mapeados a archivos y tests.
- Dependencias externas identificadas (tickets, entities, migraciones).
- Riesgos con mitigación.

## Salida

```
## Plan
specs/$ARGUMENTS/plan.md

## Cobertura RF
<RF sin cobertura o "todos">

## Riesgos
<top 3>

## Siguiente
/sdd-tasks $ARGUMENTS
```
