# Specs — índice del ciclo SDD

> Proceso: [`docs/workflows/sdd.md`](../docs/workflows/sdd.md) ·
> Decisión: [ADR 0008](../docs/adr/0008-adopcion-developai-sdd.md) (MIG-45).

Cada carpeta es una funcionalidad entregable, nombrada con el número del ticket
(`033` para MIG-33) y un slug corto en kebab-case.

## Estado de las specs

| Spec                             | Ticket | Estado                                      | Veredicto                           |
| -------------------------------- | ------ | ------------------------------------------- | ----------------------------------- |
| [`032-caja`](032-caja/spec.md)   | MIG-32 | Implementación completa; revisión pendiente | Gates OK; revisión humana pendiente |
| [`033-cobro`](033-cobro/spec.md) | MIG-33 | Aprobada para implementación                | `APROBADO` (gate de spec)           |

> Este índice se actualiza al cerrar cada fase. `/sdd-status` lo reconstruye
> leyendo los archivos.

## Anatomía

```
specs/NNN-slug/
├── spec.md        # qué y porqué (EARS)
├── clarify.md     # ambigüedades detectadas
├── plan.md        # cómo (archivos, orden, riesgos)
├── tasks.md       # tareas atómicas con "Hecho cuando"
└── validate.md    # matriz requisito → test → veredicto
```

## Reglas

1. Sin `spec.md` no se planifica; sin `plan.md` no se parte en tareas; sin
   `tasks.md` no se implementa; sin `validate.md` no se cierra.
2. Los RF tienen id estable y no se renumeran. Un cambio de alcance usa
   `/sdd-change`, no una edición silenciosa.
3. Una spec cerrada no se reescribe: se reemplaza por otra y la anterior queda
   marcada `Reemplazada por NNN`.
4. La spec no nombra archivos, clases ni SQL. El plan sí.
5. Los cuatro gates del [DoD](../docs/workflows/definition-of-done.md) son
   obligatorios para `APROBADO`.

## Comandos

| Fase | Comando                      |
| ---- | ---------------------------- |
| 0    | `/sdd-constitution <tema>`   |
| 1    | `/sdd-spec NNN-slug`         |
| 2    | `/sdd-clarify NNN-slug`      |
| 3    | `/sdd-plan NNN-slug`         |
| 4    | `/sdd-tasks NNN-slug`        |
| 5    | `/sdd-implement NNN-slug Tn` |
| 6    | `/sdd-validate NNN-slug`     |
| 7    | `/sdd-change NNN-slug`       |
| —    | `/sdd-status`                |
