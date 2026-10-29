---
description: Parte el plan en tareas atómicas con criterio de done (fase 4)
agent: planner
---

Cargá la skill `sdd`. Partí el plan de la spec indicada en tareas ejecutables.

Spec: $ARGUMENTS

## Precondición

`specs/$ARGUMENTS/plan.md` existe y cubre todos los RF.

## Pasos

1. Escribí `specs/$ARGUMENTS/tasks.md` con **máximo 10 tareas**.
2. Cada tarea debe llevar:
   - id y título con el resultado de negocio;
   - `Depends on`;
   - archivos a tocar;
   - **"Hecho cuando"** con un comando o nombre de test concreto;
   - mensaje de commit `Tn: <descripción>`.
3. Ordená por dependencia real: entities → repositorio/lookup → service →
   controller → e2e → docs.
4. La primera tarea debe poder arrancar hoy, sin decisiones pendientes.
5. Cada tarea debe durar 20–30 minutos. Si una no entra, partila.
6. Agregá un checklist final con los cuatro gates del DoD.

## Reglas

- No incluyas tareas de otros tickets: si hay una dependencia externa, marcala
  como precondición en la primera tarea.
- No inventes archivos que no estén en el plan.
- No edites código.

## Salida

```
## Tareas
T1 ... Tn

## Precondiciones
<dependencias externas o "ninguna">

## Siguiente
/sdd-implement $ARGUMENTS T1
```
