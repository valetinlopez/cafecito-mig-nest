# Workflow — SDD (Spec-Driven Development)

> Proceso adoptado en [ADR 0008](../adr/0008-adopcion-developai-sdd.md) (MIG-45).
> Esta es la fuente de verdad **humana** del ciclo. Los agentes lo consumen
> resumido desde `.agents/skills/sdd/SKILL.md` y lo ejecutan con `/sdd-*`.

---

## 1. Qué es y qué no es

**Es** un ciclo en el que el requisito se escribe, se discute y se aprueba
**antes** del código, y en el que cada requisito termina con un test y una
evidencia.

**No es** documentación de diseño por adelantado. La spec no describe clases ni
archivos: describe comportamiento observable y reglas de negocio.

| Documento    | Responde                                        | Prohibido                          |
| ------------ | ----------------------------------------------- | ---------------------------------- |
| `spec.md`    | ¿Qué debe pasar y por qué?                      | Nombres de archivos, SQL, clases   |
| `clarify.md` | ¿Qué quedó ambiguo?                             | Proponer soluciones                |
| `plan.md`    | ¿Cómo lo vamos a construir?                     | Cambiar el alcance de la spec      |
| `tasks.md`   | ¿En qué pasos se parte y cómo sé que terminé?   | Tareas de más de ~30 minutos       |
| `validate.md`| ¿Cada requisito tiene test y evidencia?         | Marcar aprobado sin correr gates   |

---

## 2. Cuándo aplica

| Situación                                          | Spec |
| -------------------------------------------------- | ---- |
| Endpoint, regla de negocio, cambio de contrato      | Sí   |
| Módulo nuevo o migración de uno existente           | Sí   |
| Refactor que altera comportamiento observable       | Sí   |
| Typo, formato, comentario, bump de parche           | No (solo DoD) |
| Cambio de infraestructura sin comportamiento nuevo  | No (solo DoD) |

Ante la duda: si el cambio puede romper un cliente, un dato o una regla de caja,
lleva spec.

---

## 3. Anatomía de una spec

```
specs/
└── 033-cobro/
    ├── spec.md        # requisitos (EARS) y criterios de aceptación
    ├── clarify.md     # hallazgos de ambigüedad (solo detección)
    ├── plan.md        # diseño técnico y orden de implementación
    ├── tasks.md       # tareas atómicas con "Hecho cuando"
    └── validate.md    # matriz requisito → test → evidencia + VEREDICTO
```

Reglas:

- El nombre es `NNN-slug` con el **número del ticket** (`033` para MIG-33) y un
  slug corto en kebab-case.
- Una spec por funcionalidad entregable, no por módulo completo.
- Los archivos se commitean con el código, en el mismo PR.
- Una spec cerrada no se reescribe: si el alcance cambia, se crea otra con el
  número del ticket nuevo y se marca la anterior como `Reemplazada por NNN`.

---

## 4. Las ocho fases

```
0. CONSTITUCIÓN → 1. SPEC → 2. CLARIFY → 3. PLAN → 4. TASKS
                                              ↓
                          6. VALIDATE ← 5. IMPLEMENT
                                              ↓
                                        7. CHANGE (si aplica)
```

| # | Fase       | Comando              | Responsable   | Gate de salida                                    |
| - | ---------- | -------------------- | ------------- | ------------------------------------------------- |
| 0 | Constitución | `/sdd-constitution` | `planner`     | La spec no contradice la constitución ni el contrato |
| 1 | Spec       | `/sdd-spec NNN-slug` | `planner`     | Requisitos en EARS, casos límite y fuera de alcance |
| 2 | Clarify    | `/sdd-clarify NNN`   | `reviewer`    | Cero `[NECESITA ACLARACIÓN]` abiertos o aceptados por el humano |
| 3 | Plan       | `/sdd-plan NNN`      | `planner`     | Archivos, orden, riesgos y estrategia de test      |
| 4 | Tasks      | `/sdd-tasks NNN`     | `planner`     | ≤ 10 tareas, cada una con "Hecho cuando" y dependencia |
| 5 | Implement  | `/sdd-implement NNN` | `implementer` | Una tarea por commit, test en rojo antes del código |
| 6 | Validate   | `/sdd-validate NNN`  | `reviewer`    | Matriz completa + `VEREDICTO` + cuatro gates verdes |
| 7 | Change     | `/sdd-change NNN`    | `planner`     | Spec nueva o enmienda justificada, nunca silenciosa |

**Máximo dos vueltas de validación.** Si la tercera vuelta falla, el problema es
de spec, no de código: se vuelve a la fase 2 con el humano.

---

## 5. Requisitos en EARS

EARS (*Easy Approach to Requirements Syntax*) evita requisitos ambiguos. Se usan
cinco formas:

| Forma            | Plantilla                                                        | Ejemplo del dominio |
| ---------------- | ---------------------------------------------------------------- | ------------------- |
| Ubicuo           | `EL SISTEMA DEBE <respuesta>`                                    | `EL SISTEMA DEBE responder 200, no 201, al cobrar un pedido.` |
| Evento           | `CUANDO <disparador>, EL SISTEMA DEBE <respuesta>`               | `CUANDO el admin cobra un pedido entregado, EL SISTEMA DEBE crear un pago por el total.` |
| Estado           | `MIENTRAS <estado>, EL SISTEMA DEBE <respuesta>`                 | `MIENTRAS no exista una caja abierta, EL SISTEMA DEBE rechazar el cobro.` |
| Condición        | `SI <condición>, ENTONCES EL SISTEMA DEBE <respuesta>`           | `SI el pedido no está entregado, ENTONCES EL SISTEMA DEBE responder 400.` |
| Característica   | `SI <característica>, ENTONCES EL SISTEMA DEBE <respuesta>`      | `SI el token no tiene rol admin, ENTONCES EL SISTEMA DEBE responder 403.` |

Reglas de redacción:

1. Un requisito = un comportamiento verificable.
2. Idioma del dominio, no del framework: "el sistema debe liberar la mesa", no
   "el service debe hacer `UPDATE mesas`".
3. Todo requisito lleva identificador estable (`RF-01`) y **nunca se renumera**.
4. Todo requisito tiene al menos un test asociado y una fila en `validate.md`.
5. Lo que no está en la spec está fuera de alcance, aunque sea "obvio".

### Formato de `spec.md`

```markdown
# Spec NNN — Título

| Campo    | Valor                       |
| -------- | --------------------------- |
| Ticket   | MIG-NN                      |
| Epic     | MIG-N                       |
| Estado   | Borrador / En revisión / Aprobada / Implementada |
| Alcance  | <una frase>                 |

## 1. Contexto        (problema de negocio, no solución)
## 2. Fuera de alcance (qué NO se hace, explícito)
## 3. Historia de usuario
## 4. Requisitos funcionales (RF-01..RF-nn en EARS)
## 5. Requisitos no funcionales (RNF: contrato, performance, seguridad)
## 6. Casos límite y errores
## 7. Criterios de aceptación (observables, uno por RF o grupo)
## 8. Supuestos y preguntas abiertas ([NECESITA ACLARACIÓN])
## 9. Referencias (contrato §, ADR, tickets)
```

---

## 6. Formato de `tasks.md`

Una tarea se puede empezar y terminar sin preguntar nada. Si no, está mal
partida.

```markdown
### T3 — Cobro en `PedidosService.cobrarPedido()`

- **Depends on:** T1, T2
- **Archivos:** `src/pedidos/pedidos.service.ts`, `src/pedidos/pedidos.service.spec.ts`
- **Hecho cuando:** `npm test -- pedidos` pasa y el test
  `rechaza el cobro si no hay caja abierta` está en verde.
- **Commit:** `T3: cobro atómico en PedidosService`
```

Reglas:

- Máximo 10 tareas por spec. Si hay más, la funcionalidad está mal recortada.
- Cada tarea toca pocos archivos y dura 20–30 minutos.
- El criterio "Hecho cuando" es un **comando o un test concreto**, nunca "queda
  funcionando".
- El orden respeta dependencias reales (entidades antes que services, DTOs antes
  que controllers).
- El implementer commitea `Tn: <descripción>` y marca `[x]` en `tasks.md`.

---

## 7. Implementación

1. El `implementer` toma **una** tarea.
2. Escribe el test primero y lo ve fallar por la razón correcta.
3. Implementa el mínimo para que pase, sin tocar archivos fuera de la tarea.
4. Corre el gate de la tarea y commitea `Tn: ...`.
5. Marca `[x]` en `tasks.md` y actualiza `DECISIONS.md` si tomó una decisión.
6. Si la tarea revela que la spec estaba mal, **se detiene** y pide `/sdd-change`.

Prohibiciones del implementer:

- Cambiar `docs/api-contract.md`, `docs/openapi.yaml` o `docs/constitution.md`.
- Editar un ADR aceptado (`docs/adr/NNNN-*.md`).
- Agrupar varias tareas en un commit.
- Declarar terminado sin correr los gates.

---

## 8. Validación y veredicto

`validate.md` se arma con evidencia, no con opiniones:

```markdown
| Requisito | Test / evidencia | Resultado |
| --------- | ---------------- | --------- |
| RF-01     | `pedidos.service.spec.ts` › `cobra un pedido entregado` | Pasa |
```

Gates obligatorios:

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
```

Veredictos posibles:

| Veredicto              | Significado                                                |
| ---------------------- | ---------------------------------------------------------- |
| `APROBADO`             | Todos los requisitos con evidencia y gates en verde.       |
| `CAMBIOS NECESARIOS`   | Hay fallas concretas; vuelve a implementación (máx. 2 vueltas). |
| `SPEC INCOMPLETA`      | Falta un requisito o una decisión; vuelve a fase 2.        |

El `reviewer` **no corrige**: describe la falla con archivo y línea, y el
implementer corrige.

---

## 9. Gobernanza de la memoria

Tres niveles, de menor a mayor permanencia:

| Nivel | Vive en                     | Se escribe cuando                        | Cambia con       |
| ----- | --------------------------- | ---------------------------------------- | ---------------- |
| Estado | `.agents/memory.md`        | Cada sesión y cada PR                    | Append / reescritura |
| Regla permanente | `src/<modulo>/AGENTS.md`, `AGENTS.md` raíz, skills | La regla aplica a todo trabajo futuro | PR normal |
| Principio innegociable | `docs/constitution.md` | Nunca por PR de feature            | ADR aprobado (§12) |

**Regla de ascenso:** si una decisión se repitió tres veces en `DECISIONS.md` o
en el chat, asciende a `AGENTS.md` o a un ADR. Si contradice un principio, se
detiene el trabajo y se abre el ADR.

**Regla de descenso:** `memory.md` no es diseño. Lo que necesita explicación va a
`DECISIONS.md` o a un ADR; `memory.md` solo guarda estado y próximo paso.

---

## 10. Anti-patrones

- Escribir `plan.md` antes de `spec.md`: se diseña una solución a un problema que
  nadie definió.
- Spec con nombres de clases o SQL: acopla el requisito a la implementación.
- `clarify.md` con soluciones: la fase detecta, no resuelve.
- Tareas de 2 horas: no se pueden validar ni revertir.
- Validar con "probé en local": el gate es un comando reproducible.
- Cambiar la spec para que pase el test: se cambia el código o se reabre la spec.
- Spec gigante que cubre un módulo entero: no entra en un sprint ni en un PR.

---

## 11. Checklist de la fase 6

```
[ ] Todos los RF tienen fila en validate.md con test que pasa
[ ] RNF verificados (status, shape, decimales, fechas, auth)
[ ] lint        [ ] typecheck     [ ] test        [ ] test:e2e
[ ] tasks.md completo y con commits Tn:
[ ] docs del módulo + memory.md actualizados
[ ] VEREDICTO escrito con fecha y revisor
```
