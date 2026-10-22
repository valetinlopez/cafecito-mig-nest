# AGENTS.md — Guía operativa del repositorio

> Punto de entrada para cualquier agente o desarrollador que trabaje en
> `cafecito-mig-nest`. Leé este archivo primero y después la documentación del
> módulo que vas a tocar.
>
> Explicación completa del esquema de trabajo: [`docs/harness.md`](docs/harness.md).

| Campo         | Valor                                                          |
| ------------- | -------------------------------------------------------------- |
| Proyecto      | Cafecitoapp — Backend NestJS                                   |
| Stack         | NestJS 12 · TypeScript 6 (ESM) · TypeORM · PostgreSQL · Vitest |
| Sprint        | S0 — Bootcamp                                                  |
| Contrato API  | [`docs/api-contract.md`](docs/api-contract.md)                 |
| Convenciones  | [`docs/conventions.md`](docs/conventions.md)                   |
| Estado actual | [`.agents/memory.md`](.agents/memory.md)                       |

Este repositorio migra el backend **FastAPI** a **NestJS** sin romper el
frontend. El backend legacy sigue operativo hasta el cutover (MIG-42).

---

## 1. Orden de lectura obligatorio

Antes de escribir una línea de código:

1. [`docs/constitution.md`](docs/constitution.md) — principios no negociables.
2. [`docs/architecture.md`](docs/architecture.md) — mapa del sistema y límites.
3. [`docs/conventions.md`](docs/conventions.md) — cómo se escribe el código.
4. `src/<modulo>/AGENTS.md` — índice local y reglas no obvias del módulo.
5. `src/<modulo>/README.md`, `CONTRACT.md`, `DECISIONS.md` — el módulo puntual.
6. [`.agents/memory.md`](.agents/memory.md) — qué está hecho y qué falta.

Si el módulo no tiene documentación, **el primer entregable es crearla** con
[`docs/workflows/new-module.md`](docs/workflows/new-module.md).

### Jerarquía de `AGENTS.md`

OpenCode carga automáticamente el `AGENTS.md` del directorio en el que trabaja.
Se usa en dos niveles:

| Nivel       | Archivo                  | Contenido                                                       |
| ----------- | ------------------------ | --------------------------------------------------------------- |
| Repositorio | `AGENTS.md`              | Reglas globales, comandos y mapa documental.                    |
| Módulo      | `src/<modulo>/AGENTS.md` | Índice de los 3 docs locales + reglas no obvias + verificación. |

**El `AGENTS.md` de módulo no duplica contenido.** Solo enruta: si una regla
necesita explicación, vive en `DECISIONS.md` o en un ADR y el shim la referencia.
Objetivo: ≤ 40 líneas.

---

## 2. Comandos canónicos

```bash
npm run start:dev      # desarrollo con watch
npm run lint           # ESLint
npm run typecheck      # tsc --noEmit
npm test               # unitarios (Vitest)
npm run test:e2e       # contrato HTTP (sin PostgreSQL)
```

Antes de dar por terminado un cambio, los cuatro comandos de verificación deben
estar en verde. El detalle está en
[`docs/workflows/definition-of-done.md`](docs/workflows/definition-of-done.md).

---

## 3. Reglas duras (resumen ejecutable)

| Regla                                                                    | Dónde se explica     |
| ------------------------------------------------------------------------ | -------------------- |
| El contrato manda: paths, campos y códigos no se renombran.              | Constitución §1      |
| JSON en `snake_case`; paths en `kebab-case`.                             | Constitución §2      |
| Todo import relativo lleva `.js` (ESM + `nodenext`).                     | Constitución §9      |
| Controller = HTTP · Service = negocio · Entity = tabla · DTO = contrato. | Constitución §3      |
| Nunca serializar una entity: siempre DTO con `fromEntity()`.             | Constitución §8      |
| Toda lista/orden/filtro se resuelve en la base, no en memoria.           | Convenciones §6.3    |
| Los decimales salen como `number`; las fechas como ISO-8601 UTC con `Z`. | ADR 0003, 0004, 0007 |
| Errores siempre `{ "detail": "..." }`; validación siempre `422`.         | ADR 0001, 0002       |
| Las colecciones aceptan con y sin barra final, sin redirect.             | ADR 0005             |
| Ningún módulo entra sin `*.spec.ts` en verde.                            | Constitución §5      |
| Prohibido `any`, `console.log` y `TODO` sin ticket.                      | Constitución §7      |
| Ninguna entity se crea a medias sobre la base compartida.                | Constitución §4      |

---

## 4. Mapa de documentación

| Documento                   | Para qué sirve                              |
| --------------------------- | ------------------------------------------- |
| `docs/constitution.md`      | Principios inmutables y cómo enmendarlos.   |
| `docs/architecture.md`      | Componentes, módulos, dependencias, flujo.  |
| `docs/conventions.md`       | Plantilla de código y checklist de PR.      |
| `docs/api-contract.md`      | Contrato funcional (32 endpoints + health). |
| `docs/openapi.yaml`         | Spec formal OpenAPI 3.1.                    |
| `docs/glossary.md`          | Enums, estados, roles y vocabulario.        |
| `docs/harness.md`           | Cómo funciona el esquema de trabajo.        |
| `docs/adr/`                 | Decisiones de arquitectura (formato ADR).   |
| `docs/workflows/`           | DoD y receta para crear módulos.            |
| `src/<modulo>/AGENTS.md`    | Shim local: por dónde empezar y qué cuidar. |
| `src/<modulo>/README.md`    | Responsabilidad, capas y estado del módulo. |
| `src/<modulo>/CONTRACT.md`  | Endpoints y shapes que expone el módulo.    |
| `src/<modulo>/DECISIONS.md` | Decisiones locales, riesgos y pendientes.   |
| `.agents/agent.md`          | Cómo trabaja un agente en este repo.        |
| `.agents/memory.md`         | Estado vivo del proyecto (se actualiza).    |

Regla de oro: **si una decisión no está escrita, no existe**. Se agrega al
`DECISIONS.md` del módulo o como ADR, nunca queda solo en el chat o en el PR.

---

## 5. Flujo de trabajo

```
1. Leer memory.md                 → saber qué está en curso
2. Leer src/<modulo>/AGENTS.md    → índice local del módulo
3. Leer los 3 docs del módulo     → contexto, contrato y decisiones
4. Verificar el contrato global   → api-contract.md / openapi.yaml
5. Implementar + test
6. Correr lint + typecheck + test + test:e2e
7. Actualizar docs del módulo + memory.md
8. Abrir PR con ticket MIG-XX
```

Para decisiones que afectan a más de un módulo: ADR nuevo en `docs/adr/` y
actualización de `docs/architecture.md`.

---

## 6. Qué NO hacer

- No cambiar el contrato para que el código compile: se cambia el código.
- No tocar el esquema de la base compartida (Neon) fuera de una migración.
- No agregar dependencias sin justificarlo en el PR.
- No crear barrels (`index.ts`) dentro de un feature module.
- No mover lógica de negocio al controller.
- No documentar en dos lugares: se referencia, no se copia.
  (Excepción: `CONTRACT.md` por módulo, que es un extracto operativo del
  contrato global y debe citar la sección de origen.)
- No usar el `AGENTS.md` de módulo como segundo README: es un índice, no contenido.
