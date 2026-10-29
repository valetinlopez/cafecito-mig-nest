---
description: Registra un cambio de alcance sin reescribir la historia de la spec (fase 7)
agent: planner
---

Cargá la skill `sdd`. Registrá el cambio de alcance solicitado sobre la spec
indicada.

Spec y cambio: $ARGUMENTS

## Pasos

1. Leé la spec, el plan y las tareas actuales.
2. Determiná el impacto:
   - **Agrega comportamiento** → spec nueva con el ticket nuevo; la anterior se
     marca `Reemplazada por NNN`.
   - **Ajusta un requisito existente** → enmienda fechada al final de `spec.md`,
     sin borrar el RF original; se agrega `RF-nn-v2` y se explica el motivo.
   - **Solo aclara redacción** → se corrige el texto y se anota en el historial.
3. Identificá qué tareas se invalidan o se agregan (`tasks.md`).
4. Actualizá `plan.md` si cambia el enfoque técnico.
5. Dejá el registro en `docs/<modulo>/DECISIONS.md` si es una decisión de negocio.

## Reglas

- No se edita una spec cerrada: se enmienda con fecha o se reemplaza.
- No se cambia el alcance para que pase un test.
- No se toca código en esta fase.
- Si el cambio contradice la constitución o el contrato, se abre ADR primero.

## Salida

```
## Tipo de cambio
Agrega | Ajusta | Aclara

## Impacto
RF afectados · tareas nuevas o invalidadas

## Artefactos
<rutas actualizadas>

## Siguiente
/sdd-plan  |  /sdd-tasks  |  /sdd-implement
```
