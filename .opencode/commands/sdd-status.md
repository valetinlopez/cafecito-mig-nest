---
description: Muestra el estado de las specs y la próxima acción del ciclo
agent: coordinator
---

Cargá la skill `sdd`. Informá el estado real de las specs del repositorio.

Filtro: $ARGUMENTS

## Pasos

1. Listá `specs/*/` y leé el encabezado de cada `spec.md` (ticket, estado,
   alcance).
2. Marcá la fase en la que está cada una según los archivos presentes:
   - solo `spec.md` → fase 1;
   - `clarify.md` → fase 2;
   - `plan.md` → fase 3;
   - `tasks.md` → fase 4;
   - tareas `[x]` parciales → fase 5;
   - `validate.md` → fase 6 (leé el veredicto).
3. Cruzalo con `.agents/memory.md` (ticket en curso) y con `tasks.md` para ver
   la próxima tarea pendiente.
4. Detectá bloqueos: `[NECESITA ACLARACIÓN]` abiertos, tareas sin `Depends on`
   cumplido, gates en rojo.

## Reglas

- No edites archivos.
- No ejecutes shell de escritura; como mucho los gates de lectura.
- Si una spec está trabada, decí exactamente qué falta y quién debe decidir.

## Salida

```
| Spec | Ticket | Fase | Veredicto | Próxima acción |
|------|--------|------|-----------|----------------|

## Bloqueos
<lista o "ninguno">

## Recomendación
<una sola acción concreta>
```
