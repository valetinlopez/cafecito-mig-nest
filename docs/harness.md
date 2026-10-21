# Harness de trabajo — qué aplicamos y por qué

| Campo          | Valor                                            |
| -------------- | ------------------------------------------------ |
| Versión        | `1.0.0`                                          |
| Fecha          | 2026-10-21                                       |
| Alcance        | Repositorio `cafecito-mig-nest` (backend NestJS) |
| Audiencia      | Equipo de desarrollo, QA y agentes de IA         |
| Documento raíz | [`AGENTS.md`](../AGENTS.md)                      |

---

## 1. Resumen ejecutivo

Aplicamos un **harness de trabajo**: un conjunto de documentos y reglas que
permiten que una persona o un agente entienda el proyecto, tome decisiones
consistentes y cierre un cambio sin contexto previo.

La estructura elegida es **híbrida**:

1. **Un `AGENTS.md` raíz** con lo global (orden de lectura, comandos, reglas
   duras).
2. **Un `AGENTS.md` fino por módulo** que actúa como índice local y se carga
   automáticamente al trabajar en ese directorio.
3. **Tres documentos de contenido por módulo**: `README.md` (qué es y cómo está),
   `CONTRACT.md` (qué expone) y `DECISIONS.md` (por qué se decidió).

La regla que ordena todo: **el `AGENTS.md` no duplica contenido, solo enruta**.

---

## 2. El problema que resuelve

Antes del harness, el conocimiento estaba repartido entre:

- `docs/api-contract.md` y `docs/openapi.yaml` (contrato).
- `docs/conventions.md` (código).
- El código mismo, como única fuente de algunas decisiones.
- El chat, los PR y la memoria de cada dev.

Eso produce cuatro fallas recurrentes:

| Falla                             | Consecuencia real                                      |
| --------------------------------- | ------------------------------------------------------ |
| Contexto incompleto al empezar    | Se implementa distinto cada módulo.                    |
| Decisiones no escritas            | Se re-discuten en cada PR o se contradicen.            |
| Documentación duplicada           | Dos fuentes de verdad que se desincronizan.            |
| Exceso de contexto para un agente | Se consumen tokens en módulos que no se están tocando. |

El harness ataca las cuatro: **enruta** el contexto, **registra** las decisiones
y **evita** la duplicación.

---

## 3. Modelo de capas

```
┌──────────────────────────────────────────────────────────────┐
│  AGENTS.md (raíz)                                            │
│  Global: orden de lectura, comandos, reglas duras, mapa docs │
└───────────────────────────┬──────────────────────────────────┘
                            │ enruta
┌───────────────────────────▼──────────────────────────────────┐
│  docs/                                                       │
│  constitution · architecture · conventions · contract ·      │
│  glossary · adr/ · workflows/                                │
└───────────────────────────┬──────────────────────────────────┘
                            │ aterriza en
┌───────────────────────────▼──────────────────────────────────┐
│  src/<modulo>/AGENTS.md   (≤ 40 líneas, auto-descubrible)    │
│  Índice local + reglas no obvias + comando de verificación   │
└───────────────────────────┬──────────────────────────────────┘
                            │ apunta a
┌───────────────────────────▼──────────────────────────────────┐
│  src/<modulo>/README.md · CONTRACT.md · DECISIONS.md         │
│  Contenido real del módulo (sin duplicar lo global)          │
└──────────────────────────────────────────────────────────────┘
```

**Principio de divulgación progresiva:** se lee poco para empezar y se profundiza
solo en el módulo que se va a tocar.

---

## 4. La decisión: por qué híbrido y no una sola modalidad

Evaluamos tres alternativas.

### Opción A — Un único `AGENTS.md` por módulo con todo adentro

| Ventajas                        | Desventajas                                                      |
| ------------------------------- | ---------------------------------------------------------------- |
| Auto-descubrimiento nativo.     | Mezcla contrato, diseño e instrucciones: se desactualiza rápido. |
| Un solo archivo para encontrar. | 15 módulos × ~100 líneas = contexto inflado en cada corrida.     |
| Simple de explicar.             | Duplica el contrato global y las convenciones.                   |

### Opción B — Solo `README + CONTRACT + DECISIONS` por módulo

| Ventajas                               | Desventajas                                                       |
| -------------------------------------- | ----------------------------------------------------------------- |
| Separación clara de responsabilidades. | No hay auto-descubrimiento: depende de que el agente lea el raíz. |
| Sin duplicación.                       | Si el agente no sigue el índice, trabaja sin contexto local.      |
| Escala bien con 15+ módulos.           | El punto de entrada local no es evidente para un humano nuevo.    |

### Opción C — Híbrido: `AGENTS.md` fino + tres documentos (elegida)

| Ventajas                                                          | Costos                                              |
| ----------------------------------------------------------------- | --------------------------------------------------- |
| Auto-descubrimiento con contexto mínimo (≤ 40 líneas).            | Un archivo más por módulo (15 en total).            |
| Una sola fuente de verdad para el contenido.                      | Requiere disciplina: el shim no duplica.            |
| Reglas locales visibles justo donde se trabaja.                   | Hay que mantener el índice si cambia la estructura. |
| Escala: el costo de contexto crece con el módulo, no con el repo. | —                                                   |

**Decisión:** Opción C.

**Motivo corto:** combina el mecanismo de carga de OpenCode (`AGENTS.md` en el
directorio) con una arquitectura documental que no duplica. El shim resuelve el
"¿dónde empiezo?" y los tres documentos resuelven el "¿qué y por qué?".

---

## 5. Inventario de documentos

### 5.1 Globales

| Documento                              | Responde                                 | Cuándo se actualiza                   |
| -------------------------------------- | ---------------------------------------- | ------------------------------------- |
| `AGENTS.md`                            | ¿Por dónde empiezo y qué no puedo hacer? | Cambia el flujo o una regla global.   |
| `docs/constitution.md`                 | ¿Qué principios no se negocian?          | Solo por ADR aprobado.                |
| `docs/architecture.md`                 | ¿Cómo está compuesto el sistema?         | Cambia un componente o dependencia.   |
| `docs/conventions.md`                  | ¿Cómo se escribe el código?              | Cambia el patrón de implementación.   |
| `docs/api-contract.md`                 | ¿Qué expone la API?                      | Cambia un endpoint o un shape.        |
| `docs/openapi.yaml`                    | ¿Cuál es la spec formal?                 | Igual que el contrato.                |
| `docs/glossary.md`                     | ¿Qué significa cada término y estado?    | Nuevo enum, rol o término de negocio. |
| `docs/harness.md`                      | ¿Cómo funciona este esquema de trabajo?  | Cambia el harness.                    |
| `docs/workflows/definition-of-done.md` | ¿Cuándo está terminado un cambio?        | Cambian los criterios de cierre.      |
| `docs/workflows/new-module.md`         | ¿Cómo se implementa un módulo?           | Cambia la receta de implementación.   |
| `.agents/agent.md`                     | ¿Cómo opera un agente?                   | Cambia el modo de trabajo.            |
| `.agents/memory.md`                    | ¿Qué está hecho y qué sigue?             | En cada sesión y cada PR.             |

### 5.2 Por módulo

| Documento      | Responde                                                    | Extensión objetivo |
| -------------- | ----------------------------------------------------------- | ------------------ |
| `AGENTS.md`    | ¿Dónde empiezo en este directorio? ¿Qué reglas raras tiene? | ≤ 40 líneas        |
| `README.md`    | ¿Qué hace, cómo está armado y en qué estado está?           | 60–120 líneas      |
| `CONTRACT.md`  | ¿Qué endpoints y shapes expone?                             | 40–120 líneas      |
| `DECISIONS.md` | ¿Qué se decidió, por qué y qué falta?                       | 40–120 líneas      |

Los tres documentos de contenido son la **fuente de verdad del módulo**. El
`AGENTS.md` solo los referencia.

### 5.3 ADRs

| Documento            | Responde                                          |
| -------------------- | ------------------------------------------------- |
| `docs/adr/README.md` | Índice, estados y plantilla.                      |
| `docs/adr/NNNN-*.md` | Contexto, decisión, alternativas y consecuencias. |

Un ADR **no se edita**: si cambia la decisión, se crea otro y se marca el anterior
como reemplazado.

---

## 6. Cómo lo usa un agente

```
1. Carga automática de AGENTS.md raíz
2. El ticket apunta a un módulo (ej. src/mesas)
3. Carga automática de src/mesas/AGENTS.md
4. Lee README → CONTRACT → DECISIONS (solo de ese módulo)
5. Implementa siguiendo conventions.md y constitution.md
6. Verifica con lint + typecheck + test + test:e2e
7. Actualiza docs del módulo + memory.md
```

**Por qué funciona:** el agente recibe el contexto global una vez y el contexto
local solo cuando corresponde. No arrastra los otros 14 módulos.

**Handoff:** si cambia de sesión o de agente, `.agents/memory.md` contiene el
ticket en curso, lo tocado, lo que falta y el próximo paso. Otro agente puede
continuar leyendo solo el repositorio.

---

## 7. Cómo lo usa una persona

### Onboarding (primer día)

1. `AGENTS.md` raíz.
2. `docs/architecture.md` y `docs/glossary.md`.
3. `docs/conventions.md`.
4. `src/categorias/` completo: es el módulo de referencia.

### Antes de un ticket

1. Leer el `AGENTS.md` del módulo.
2. Leer `CONTRACT.md` y verificar la sección del contrato global.
3. Revisar `DECISIONS.md` para no contradecir una decisión previa.

### Antes del PR

1. Correr el checklist de `docs/workflows/definition-of-done.md`.
2. Actualizar los documentos del módulo y `memory.md`.
3. Si la decisión cruza módulos, agregar un ADR y actualizar `architecture.md`.

---

## 8. Reglas de mantenimiento

### 8.1 Una sola fuente de verdad

| Información               | Vive en                                             |
| ------------------------- | --------------------------------------------------- |
| Contrato de la API        | `docs/api-contract.md` + `docs/openapi.yaml`        |
| Extracto operativo        | `src/<modulo>/CONTRACT.md` (cita la sección)        |
| Decisión transversal      | `docs/adr/`                                         |
| Decisión local            | `src/<modulo>/DECISIONS.md`                         |
| Principios                | `docs/constitution.md`                              |
| Cómo se escribe el código | `docs/conventions.md`                               |
| Estado del proyecto       | `.agents/memory.md`                                 |
| Enrutamiento para agentes | `AGENTS.md` raíz y por módulo (sin contenido nuevo) |

**Regla:** si un dato aparece en dos lugares, uno de los dos es una referencia.
Nunca copiar y mantener dos copias.

### 8.2 Qué actualizar según el cambio

| Cambio                         | Actualizar                                           |
| ------------------------------ | ---------------------------------------------------- |
| Nuevo endpoint o campo         | contrato global + `CONTRACT.md` + `README.md`        |
| Nueva regla de negocio         | `DECISIONS.md` del módulo                            |
| Decisión que afecta 2+ módulos | ADR + `architecture.md`                              |
| Nuevo módulo                   | los 4 archivos + `app.module.ts` + `architecture.md` |
| Cambio de estado del módulo    | `README.md` + `architecture.md` + `memory.md`        |
| Cambio de principio            | ADR + nueva versión de `constitution.md`             |

### 8.3 Propiedad

- Cada módulo tiene un dev responsable (el que tomó el ticket).
- `docs/architecture.md` y `docs/constitution.md` los mantiene el tech lead.
- `memory.md` lo actualiza quien cierra la sesión o el PR.
- Un ADR lo escribe quien toma la decisión y lo revisa el equipo.

---

## 9. Convenciones de redacción

1. **Español**, tono técnico y directo.
2. **Tablas** para comparaciones y estados; prosa solo cuando aporta.
3. **Rutas relativas** y nombres exactos de archivo.
4. **Ejemplos realistas**, no placeholders (`"Bebidas"`, `850.0`).
5. **Citar la fuente** cuando se extrae del contrato (`§6.2`, `D-05`).
6. **Marcar el estado**: implementado, scaffold, pendiente, fuera de alcance.
7. **No prometer**: si algo no está verificado, decirlo.
8. **Fechas y tickets**: toda decisión relevante referencia un `MIG-XX`.

---

## 10. Decisiones de diseño y su fundamento

| Decisión                               | Fundamento                                                     |
| -------------------------------------- | -------------------------------------------------------------- |
| `AGENTS.md` fino por módulo            | Aprovecha el auto-load sin inflar el contexto.                 |
| Documentos de contenido separados      | Cada pregunta tiene un archivo; se actualiza el que cambió.    |
| Docs junto al código (`src/<modulo>/`) | Se leen en contexto y se revisan en el mismo PR.               |
| Memoria global única                   | Evita 15 bitácoras desincronizadas; el estado es del proyecto. |
| ADR para decisiones transversales      | Trazabilidad e inmutabilidad; no se reescribe la historia.     |
| Contrato como fuente de verdad         | El código se adapta; nunca al revés (constitución §1).         |
| Un DoD explícito                       | "Terminado" deja de ser una opinión.                           |
| Español en la documentación            | Es el idioma del equipo y del dominio del negocio.             |

---

## 11. Qué NO hacer

- No copiar el contrato global dentro de cada módulo: se cita la sección.
- No poner lógica de negocio en el `AGENTS.md`: va en `DECISIONS.md`/services.
- No convertir el `AGENTS.md` en un segundo README.
- No editar un ADR aceptado: se crea uno nuevo.
- No documentar una decisión solo en el PR o en el chat.
- No crear documentación para un módulo que no existe sin marcarla como scaffold.
- No usar la memoria como diseño: `memory.md` es estado, no arquitectura.

---

## 12. Cómo saber si el harness funciona

Señales positivas:

- Un dev nuevo puede abrir un PR de un módulo sin preguntar "¿dónde está el
  contrato?".
- Un agente implementa un módulo sin contradecir decisiones previas.
- Los PR incluyen el diff de docs junto con el código.
- Las discusiones de PR son sobre negocio, no sobre convenciones.

Señales de alerta:

- `DECISIONS.md` lleva semanas sin cambios pero el código sí cambió.
- Aparecen dos documentos que describen el mismo endpoint.
- `memory.md` no refleja el estado real.
- Un `AGENTS.md` de módulo supera las 50 líneas.

---

## 13. Próximos pasos

1. Revisar las preguntas abiertas de `.agents/memory.md` (tablas reales,
   movimientos de caja, `X-Response-Time-ms`, refresh token).
2. Implementar MIG-20 con `docs/workflows/new-module.md` como primera prueba real
   del harness.
3. Después del primer módulo, ajustar el shim si aparece información repetida.
4. Evaluar ADRs nuevos para zona horaria de reportes y refresh token.

---

## 14. Preguntas frecuentes

**¿Por qué no un solo `AGENTS.md` por módulo?**
Porque mezcla contrato, estado y decisiones, se desactualiza y consume contexto
en cada corrida. El híbrido mantiene el auto-load con costo mínimo.

**¿Por qué los docs están en `src/` y no en `docs/modules/`?**
Porque se leen y revisan junto al código. Además, así un agente que trabaja en el
directorio encuentra todo sin saltar de árbol.

**¿Qué pasa si el `AGENTS.md` del módulo y el `DECISIONS.md` se contradicen?**
Gana `DECISIONS.md` (contenido); el shim es solo un índice. Se corrige el shim en
el mismo PR.

**¿Dónde va una decisión que afecta a dos módulos?**
En `docs/adr/`, con referencia desde el `DECISIONS.md` de cada módulo afectado.

**¿Cada cuánto se actualiza `memory.md`?**
Al cerrar cada sesión o PR. Es estado, no historial: se reescribe, no se acumula.

**¿Quién puede cambiar la constitución?**
El equipo, mediante un ADR aprobado y una nueva versión del documento. No se
cambia en un PR de feature.

**¿Esto reemplaza `docs/conventions.md`?**
No. Lo complementa: conventions responde "cómo se escribe"; el harness responde
"dónde está cada cosa y por qué".

---

_Documento vivo. Si el harness cambia, se actualiza esta explicación y
`.agents/memory.md` en el mismo PR._
