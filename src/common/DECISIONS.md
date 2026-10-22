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

**Decisión:** `APP_FILTER`, `APP_PIPE` y `APP_INTERCEPTOR` en `CommonModule`;
guards con `@UseGuards` por controller.

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

**Nota:** el ticket MIG-20 menciona `forbidNonWhitelisted: true`. Se implementa
`false` porque el contrato (§9.2), el ADR 0001 y esta decisión lo fijan así;
cambiarlo requiere un ADR.

---

## D-06 — El header de tiempo es opcional para el contrato

**Decisión:** implementarlo como interceptor y no bloquear el contrato si falta.

**Motivo:** no se identificó consumo en el front (D-11). Agregarlo es barato,
pero no es un criterio de aceptación. Desde MIG-20 se emite siempre.

---

## D-07 — Las utilidades de test no van en `src`

**Decisión:** los mocks compartidos (MIG-21) viven en `test/` o en un
`src/common/testing/` excluido del build.

**Motivo:** no deben empaquetarse en producción. Se decide al implementar MIG-21.

---

## D-08 — Un solo filtro global, no tres

**Decisión:** `AllExceptionsFilter` (`@Catch()`) resuelve HTTP y errores
inesperados. La traducción de validación vive en el `exceptionFactory` del pipe.

**Motivo:** el ticket pedía filtros separados para `HttpException`,
`ValidationException` y `all`. Tres filtros solapados obligan a depender del
orden de resolución de Nest y duplican la extracción del mensaje. El ADR 0002 y
`CONTRACT.md` nombran una sola pieza; los criterios de aceptación se cumplen
igual.

**Alternativa descartada:** `@Catch(HttpException)` + `@Catch(Error)`. Se puede
adoptar si aparece un caso que requiera un shape distinto por familia.

---

## D-09 — CORS: default legacy y wildcard reflejado

**Decisión:** si `CORS_ORIGINS` está vacía se usa `http://localhost:3000`; si
incluye `*` se refleja el origen del request y se loguea una advertencia.

**Motivo:** replica `main.py` y evita que un desarrollador sin `.env` quede sin
CORS. `*` con `credentials: true` no es válido para el navegador: reflejar es la
única forma de respetar el wildcard. `appConfig.corsOrigins` sigue devolviendo la
lista cruda (vacía si no hay variable); el default se aplica al construir las
opciones.

**Riesgo:** en producción, olvidar `CORS_ORIGINS` deja solo localhost habilitado.
Se documenta en el README y en el PR de MIG-20.

---

## D-10 — Prefijo y CORS en `app.setup.ts`

**Decisión:** `configureApp()` centraliza `setGlobalPrefix`, `enableCors` y el
fallback 404. `main.ts` y los e2e lo llaman.

**Motivo:** si el prefijo viviera solo en `main.ts`, cada e2e lo replicaría y
podría divergir. `configureApp` inicializa la app para registrar el fallback
**después** del router de Nest; un `listen()` posterior reutiliza la instancia.

**Fallback:** Express responde HTML para paths fuera del prefijo. El contrato
exige `{ detail }` en todo no-2xx, así que se agrega un middleware final que
devuelve `404` con `Recurso no encontrado`.

---

## D-11 — Traducción: primero el DTO, después el diccionario

**Decisión:** si el mensaje del constraint no arranca con `must`/`should` (o no
contiene `$property`), se considera propio del DTO y se devuelve intacto. Si es
un default de `class-validator`, se traduce por texto exacto, por parámetros o
por nombre de constraint.

**Motivo:** ADR 0001 pide mensajes en español en cada DTO. El diccionario cubre
los DTOs que todavía no los definen y evita que un default en inglés llegue al
front. No se pisa un mensaje de negocio escrito a mano.

---

## D-12 — `CommonModule` para poder testear el cableado

**Decisión:** los `APP_*` viven en `CommonModule` y los e2e lo importan.

**Motivo:** `AppModule` depende de PostgreSQL. Sin un módulo separado, el e2e del
contrato transversal tendría que duplicar la lista de providers y podría quedar
verde con una configuración distinta a la de producción.

---

## D-13 — Exponer `X-Response-Time-ms` por CORS

**Decisión:** `exposedHeaders: ['X-Response-Time-ms']`.

**Motivo:** sin `Access-Control-Expose-Headers` el navegador no puede leer el
header, así que el dato de performance sería inútil para RUM. No cambia el
contrato ni el body.

---

## D-14 — Reloj compartido entre middleware, interceptor y filtro

**Decisión:** `responseTimeMiddleware` guarda el instante de inicio en el
`Response`; el interceptor, el filtro y el fallback cierran la medición con
`finishResponseTimer()`.

**Motivo:** el interceptor no ve los errores de guard (MIG-24) ni las rutas que
no matchean el router. Sin el middleware, esos `4xx` quedarían sin header. La
medición es "first wins" y el header se escribe una sola vez, así que no hay
valores pisados ni lógica duplicada.
