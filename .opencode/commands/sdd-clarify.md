---
description: Detecta ambigüedades en una spec sin proponer soluciones (fase 2)
agent: reviewer
---

Cargá la skill `sdd`. Actuá como revisor independiente de la spec indicada.

Spec: $ARGUMENTS

## Pasos

1. Leé `specs/$ARGUMENTS/spec.md`, el contrato (§ del recurso), el glosario y el
   `DECISIONS.md` del módulo.
2. Buscá, sin proponer soluciones:
   - requisitos no verificables ("adecuado", "rápido", "correcto");
   - comportamientos faltantes en casos de error o concurrencia;
   - contradicciones con el contrato (status, shape, auth, códigos);
   - decisiones de negocio sin dueño;
   - alcance disfrazado (cosas que el texto asume y no declara).
3. Escribí `specs/$ARGUMENTS/clarify.md` con la tabla de hallazgos.
4. No reescribas la spec. El planner la corrige.

## Formato de `clarify.md`

```markdown
# Clarify — NNN

| # | Severidad | Ubicación | Detección | Pregunta |
|---|-----------|-----------|-----------|----------|

## Estado
Abiertos: N · Resueltos: N
```

## Reglas

- Si un hallazgo bloquea el plan, marcalo `Alta` y decilo en el veredicto.
- Nada de soluciones, nombres de archivos ni código.

## Salida

```
## Hallazgos
<N por severidad>

## Veredicto
SPEC LISTA | SPEC INCOMPLETA

## Siguiente
/sdd-plan $ARGUMENTS  |  volver a /sdd-spec
```
