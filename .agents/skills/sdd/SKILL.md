---
name: sdd
description: Ciclo Spec-Driven Development (DevelopAI) del repositorio cafecito-mig-nest. Úsala cuando haya que escribir una spec, aclarar requisitos, planificar, partir tareas, implementar tarea por tarea o validar un cambio contra sus requisitos. Activa también cuando se pida crear un módulo, un endpoint o una regla de negocio nueva.
metadata:
  version: "1.0.0"
  domain: process
  triggers: spec, SDD, requisitos, EARS, plan, tasks, validar, veredicto, MIG, developai
  source: docs/workflows/sdd.md
---

# SDD — Ciclo Spec-Driven Development

Fuente de verdad del proceso: [`docs/workflows/sdd.md`](../../../docs/workflows/sdd.md).
Decisión: [`docs/adr/0008-adopcion-developai-sdd.md`](../../../docs/adr/0008-adopcion-developai-sdd.md).
Si esta skill y el workflow se contradicen, **gana el workflow**.

## Regla mental

> Primero el **qué** y el **porqué**, después el **cómo**.
> Si no está escrito en la spec, está fuera de alcance.

## Flujo

```
0 CONSTITUCIÓN → 1 SPEC → 2 CLARIFY → 3 PLAN → 4 TASKS → 5 IMPLEMENT → 6 VALIDATE
                                                              └─ 7 CHANGE (si el alcance cambia)
```

| Fase | Produce                              | Gate de salida                                      |
| ---- | ------------------------------------ | --------------------------------------------------- |
| 0    | Chequeo contra constitución/contrato | No contradice §1, §3, §4, §5, §8, §9                |
| 1    | `specs/NNN-slug/spec.md`             | RF en EARS + casos límite + fuera de alcance        |
| 2    | `specs/NNN-slug/clarify.md`          | Sin ambigüedades abiertas (o aceptadas por humano)  |
| 3    | `specs/NNN-slug/plan.md`             | Archivos, orden, riesgos, estrategia de test        |
| 4    | `specs/NNN-slug/tasks.md`            | ≤ 10 tareas con "Hecho cuando" y dependencias       |
| 5    | Código + tests + commits `Tn:`       | Test en rojo antes del código, gate por tarea       |
| 6    | `specs/NNN-slug/validate.md`         | Matriz RF → test + `VEREDICTO` + 4 gates verdes     |

Máximo **dos vueltas** de validación. A la tercera, el problema es la spec.

## EARS (obligatorio en RF)

| Forma      | Plantilla                                              |
| ---------- | ------------------------------------------------------ |
| Ubicuo     | `EL SISTEMA DEBE <respuesta>`                          |
| Evento     | `CUANDO <disparador>, EL SISTEMA DEBE <respuesta>`     |
| Estado     | `MIENTRAS <estado>, EL SISTEMA DEBE <respuesta>`       |
| Condición  | `SI <condición>, ENTONCES EL SISTEMA DEBE <respuesta>` |

- Un RF = un comportamiento verificable, con id estable (`RF-01`).
- Dominio, no framework: "el sistema libera la mesa", no "el service hace UPDATE".
- Nada de nombres de archivos, clases ni SQL en `spec.md`.

## Plantillas

### `spec.md`

```markdown
# Spec NNN — Título

| Campo   | Valor                                             |
| ------- | ------------------------------------------------- |
| Ticket  | MIG-NN                                            |
| Epic    | MIG-N                                             |
| Estado  | Borrador                                          |
| Alcance | <una frase>                                       |

## 1. Contexto
## 2. Fuera de alcance
## 3. Historia de usuario
## 4. Requisitos funcionales
- **RF-01** CUANDO ..., EL SISTEMA DEBE ...
## 5. Requisitos no funcionales
## 6. Casos límite y errores
## 7. Criterios de aceptación
## 8. Supuestos y preguntas abiertas
## 9. Referencias (contrato §, ADR, tickets)
```

### `tasks.md`

```markdown
### T1 — <resultado de negocio>

- **Depends on:** —
- **Archivos:** `src/...`
- **Hecho cuando:** `npm test -- <modulo>` pasa y `<test concreto>` está en verde.
- **Commit:** `T1: <descripción>`
```

Máximo 10 tareas, 20–30 minutos cada una.

### `validate.md`

```markdown
| Requisito | Test / evidencia | Resultado |
| --------- | ---------------- | --------- |
| RF-01     | `<spec file>` › `<nombre del test>` | Pasa |

## Gates
- lint: OK · typecheck: OK · test: N · test:e2e: N

## VEREDICTO: APROBADO
```

Veredictos: `APROBADO`, `CAMBIOS NECESARIOS`, `SPEC INCOMPLETA`.

## Permisos por rol

| Rol           | Puede editar                                    | No puede                          |
| ------------- | ----------------------------------------------- | --------------------------------- |
| `coordinator` | `specs/` (estado), nada de código               | Implementar, correr shell de escritura |
| `planner`     | `specs/`, `docs/`                               | Código, shell, constitución, contrato, ADR |
| `implementer` | `src/`, `test/`, `specs/` (checkboxes), docs del módulo | Contrato, constitución, ADR, `git push` |
| `reviewer`    | Nada                                            | Editar cualquier archivo          |

## Reglas duras

1. No se escribe código sin `spec.md` aprobada (salvo cambio sin comportamiento).
2. No se cambia el contrato, la constitución ni un ADR desde implementación.
3. Cada RF tiene test y fila en `validate.md`; sin eso no hay `APROBADO`.
4. Una tarea = un commit `Tn: ...` = un gate corrido.
5. Si la implementación descubre que la spec está mal: `/sdd-change`, no silencio.
6. `[NECESITA ACLARACIÓN]` sin resolver bloquea el plan: se pregunta una cosa por vez.
7. La evidencia es un comando reproducible, no "funciona en local".

## Anti-patrones

- `plan.md` antes de `spec.md`.
- Spec con clases, archivos o SQL.
- `clarify.md` con soluciones en lugar de detecciones.
- Tareas de dos horas o "queda funcionando".
- Ajustar el test o la spec para que pase el gate.

## Verificación

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
```
