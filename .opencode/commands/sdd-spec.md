---
description: Crea la spec de una funcionalidad (fase 1 del ciclo SDD)
agent: planner
---

Cargá la skill `sdd`. Escribí la especificación de la funcionalidad indicada.

Spec: $ARGUMENTS

## Pasos

1. Resolvé el ticket `MIG-XX` y el epic reales (no los inventes). Si no están
   claros, preguntá.
2. Creá `specs/$ARGUMENTS/spec.md` con la plantilla de la skill.
3. Antes de escribir, hacé **como máximo cinco preguntas**, de a una por vez,
   sobre lo que no se pueda deducir del contrato, el glosario o `DECISIONS.md`.
4. Redactá los RF en EARS, con id estable (`RF-01`...), un comportamiento
   verificable por requisito.
5. Completá: contexto, fuera de alcance (explícito), historia de usuario, RNF
   (status, shape, decimales, fechas, auth), casos límite, criterios de
   aceptación y referencias al contrato.
6. Lo que no puedas decidir va como `[NECESITA ACLARACIÓN]`. No lo resuelvas por
   tu cuenta.

## Reglas

- La spec dice **qué** y **porqué**. Prohibido nombrar archivos, clases, SQL o
  frameworks.
- No contradigas `docs/api-contract.md`: si el contrato no cubre el caso, marcalo
  como pregunta abierta.
- No escribas `plan.md` ni `tasks.md` en este paso.
- No edites código.

## Gate de salida

- Todos los RF en EARS, con id y sin ambigüedad.
- Fuera de alcance escrito.
- Casos límite y errores cubiertos.
- Preguntas abiertas listadas (o "ninguna").

## Salida

```
## Spec
specs/$ARGUMENTS/spec.md

## Requisitos
RF-01 ... RF-nn

## Abierto
[Necesita aclaración] o "ninguno"

## Siguiente
/sdd-clarify $ARGUMENTS
```
