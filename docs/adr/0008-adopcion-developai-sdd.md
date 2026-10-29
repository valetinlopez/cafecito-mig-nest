# 0008 — Adopción de DevelopAI: SDD y orquestación multiagente

| Campo     | Valor                                  |
| --------- | -------------------------------------- |
| Estado    | Aceptado                               |
| Fecha     | 2026-10-29                             |
| Decisores | Equipo backend Cafecitoapp             |
| Tags      | proceso, ia, docs, harness, sdd        |
| Ticket    | MIG-45                                 |

## Contexto

El equipo trabaja con un harness propio (constitución, arquitectura,
convenciones, contrato, docs por módulo y memoria global) que resolvió el
problema del contexto disperso. Ese harness cubre bien la capa de **arnés**
(qué leer y qué no romper), pero deja tres huecos frente al modelo DevelopAI:

1. **No hay especificación previa al código.** El trabajo arranca en el ticket de
   Jira y el `DECISIONS.md`, no en una `spec.md` con requisitos funcionales
   verificables. El "qué" y el "porqué" quedan implícitos en la conversación.
2. **No hay separación de roles.** Una sola persona o agente planifica,
   implementa y valida su propio trabajo. Nadie revisa con criterio
   independiente antes del PR.
3. **No hay trazabilidad requisito → test.** El DoD exige tests, pero no exige
   demostrar que **cada** requisito tiene su test y su evidencia.

Restricciones que condicionan la decisión:

- El contrato de API está congelado por compatibilidad con el frontend
  (constitución §1 y §2).
- La base es compartida con producción (constitución §4).
- El equipo es de 3 devs: el proceso no puede agregar burocracia que nadie
  mantenga.
- Los MCP servers ya están configurados globalmente en el entorno de cada dev;
  este repositorio no los versiona.
- No se agregan dependencias de runtime para adoptar el proceso.

## Decisión

Se adopta **DevelopAI** en sus tres capas, adaptado al harness existente:

1. **Arnés (C1):** se mantiene `docs/constitution.md` v1.0.0 con sus 12
   artículos y se declaran **seis innegociables** que actúan como gates del
   ciclo SDD. Se agregan dos skills (`sdd`, `nestjs-esm`), nueve comandos
   (`/sdd-*`) y cuatro agentes (`coordinator`, `planner`, `implementer`,
   `reviewer`) con permisos distintos.
2. **Proceso (C2):** toda funcionalidad nueva pasa por
   `specs/NNN-slug/spec.md` → `clarify.md` → `plan.md` → `tasks.md` →
   implementación → `validate.md` con `VEREDICTO` explícito.
3. **Orquestación (C3):** el agente primario es `coordinator` y **no escribe
   código**; delega en `planner` (solo `specs/` y `docs/`), `implementer`
   (código y tests, una tarea por commit) y `reviewer` (solo lectura y
   verificación).

### Mapeo de innegociables

| Innegociable SDD          | Artículo de la constitución |
| ------------------------- | --------------------------- |
| Contrato primero          | §1                          |
| Una capa, una responsab.  | §3                          |
| La base es compartida     | §4                          |
| Todo módulo entra con tests | §5                        |
| Seguridad por defecto     | §8                          |
| ESM explícito             | §9                          |

El resto de los artículos (§2, §6, §7, §10, §11, §12) sigue vigente como
convención y se verifica con `lint`, `typecheck` y el DoD; no se deroga ninguno.

## Alternativas consideradas

| Alternativa                                   | Por qué se descarta                                                                 |
| --------------------------------------------- | ----------------------------------------------------------------------------------- |
| No adoptar SDD y seguir con ticket + DoD      | Se mantiene el hueco de trazabilidad requisito → test y la auto-revisión.           |
| Reescribir la constitución a 6 artículos      | Borra historia y obliga a reabrir decisiones ya cerradas. Se resuelve con un mapeo. |
| Adoptar una herramienta externa de specs      | Agrega dependencia y salida del repositorio; el equipo ya vive en el repo y en Jira. |
| Un solo agente con un prompt más largo         | No separa planificación de ejecución ni revisión; el problema es de permisos, no de prompt. |

## Consecuencias

**Positivas**

- Cada requisito tiene un test y una evidencia asociados antes de cerrar el PR.
- El plan y las tareas se revisan **antes** de escribir código, cuando cambiarlos
  es barato.
- Los permisos de los agentes impiden que quien implementa cambie el contrato, la
  constitución o los ADR por su cuenta.
- El relevo entre sesiones o personas mejora: `specs/` + `memory.md` alcanzan
  para continuar.

**Negativas / costos**

- Una spec por funcionalidad es trabajo de escritura que no existía.
- El ciclo tiene más pasos: hay que resistir la tentación de saltear `clarify`.
- Los agentes con permisos restringidos requieren que el pedido sea preciso; un
  pedido ambiguo vuelve como pregunta en lugar de como código.

## Implementación

| Pieza                          | Ubicación                                              |
| ------------------------------ | ------------------------------------------------------ |
| Proceso y plantillas (humano)  | `docs/workflows/sdd.md`                                |
| Skill del ciclo SDD            | `.agents/skills/sdd/SKILL.md`                          |
| Skill de NestJS + ESM          | `.agents/skills/nestjs-esm/SKILL.md`                   |
| Comandos                       | `.opencode/commands/sdd-*.md`                          |
| Agentes y permisos             | `.opencode/agents/{coordinator,planner,implementer,reviewer}.md` |
| Especificaciones               | `specs/NNN-slug/` (+ índice en `specs/README.md`)      |
| Gates automáticos              | `.github/workflows/ci.yml`                             |
| Enrutamiento para agentes      | `AGENTS.md` raíz §7 y `.agents/agent.md` §8            |

**Excepción de alcance:** un cambio sin comportamiento nuevo (typo, formato,
comentario, dependencia de versión parche) no requiere spec; se rige solo por el
[DoD](../workflows/definition-of-done.md).

## Verificación

1. `docs/workflows/sdd.md` describe las ocho fases y sus gates.
2. `/sdd-status` lista las specs y su estado; `/sdd-spec 033-cobro` produce la
   estructura esperada.
3. `specs/033-cobro/validate.md` demuestra la matriz requisito → test → tarea.
4. `npm run lint`, `npm run typecheck`, `npm test` y `npm run test:e2e` en verde.
5. El workflow de CI corre los cuatro gates en cada PR.

## Referencias

- `docs/constitution.md` §1, §3, §4, §5, §8, §9
- `docs/harness.md` §15
- `docs/workflows/sdd.md`
- `specs/033-cobro/spec.md` (piloto)
- MIG-45
