# Decisiones — `common`

---

## D-01 — Un módulo transversal, no una carpeta de utilidades

**Decisión:** `common` agrupa piezas de infraestructura con contrato propio
(filtros, pipes, guards, interceptores, transformers).

**Motivo:** evita que cada módulo implemente su versión del filtro de errores o
del guard. La carpeta de utilidades genéricas (`helpers`, `utils`) se evita hasta
que exista una necesidad real y compartida.

---

## D-02 — Registro global vía tokens `APP_*`

**Decisión:** `APP_FILTER`, `APP_PIPE` y `APP_INTERCEPTOR` en `AppModule`; guards
con `@UseGuards` por controller.

**Motivo:** el filtro y el pipe deben aplicarse a todo sin excepción. Un guard
global obligaría a marcar cada ruta pública (`/auth/login`, `/health`) y un
olvido deja el sistema inaccesible. Con guard por controller, la protección se
declara junto al recurso.

**Alternativa descartada:** `APP_GUARD` global desde el primer ticket. Se puede
adoptar cuando todas las rutas tengan su decorador `@Public()` auditado.

---

## D-03 — Sin barrels

**Decisión:** imports al archivo concreto (`common/guards/jwt-auth.guard.js`).

**Motivo:** consistencia con los feature modules y evitar ciclos. Si en el futuro
se agrega un barrel, se limita a `common` y no reexporta entities.

---

## D-04 — `numericTransformer` en `common/transformers`

**Decisión:** un transformer compartido, no uno por entity.

**Motivo:** la regla `numeric → number` es única (ADR 0004). Tener copias por
módulo garantiza que alguna quede desactualizada.

---

## D-05 — `ValidationPipe` con `forbidNonWhitelisted: false`

**Decisión:** descartar campos desconocidos sin fallar.

**Motivo:** Pydantic (legacy) ignora campos extra; el front puede enviar campos
de más. Endurecerlo ahora rompería requests que hoy funcionan.

---

## D-06 — El header de tiempo es opcional

**Decisión:** implementarlo como interceptor y no bloquear el contrato si falta.

**Motivo:** no se identificó consumo en el front (D-11). Agregarlo es barato,
pero no es un criterio de aceptación.

---

## D-07 — Las utilidades de test no van en `src`

**Decisión:** los mocks compartidos (MIG-21) viven en `test/` o en un
`src/common/testing/` excluido del build.

**Motivo:** no deben empaquetarse en producción. Se decide al implementar MIG-21.
