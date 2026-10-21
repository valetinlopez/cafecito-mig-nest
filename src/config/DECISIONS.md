# Decisiones — `config`

---

## D-01 — `registerAs` con namespaces

**Decisión:** tres namespaces (`app`, `auth`, `database`) registrados con
`registerAs`.

**Motivo:** agrupa la configuración por dominio, permite inyectarla tipada con
`@Inject(appConfig.KEY)` y evita strings sueltos de claves por todo el código.

**Alternativa descartada:** leer `process.env` directo en cada service (no
valida, no tipa, no testea).

---

## D-02 — Validación fail-fast al arrancar

**Decisión:** `validateEnvironment` corta el arranque si algo falta o es inválido.

**Motivo:** es preferible un contenedor que no levanta a un backend que responde
`500` en cada request por una variable ausente.

---

## D-03 — `NODE_ENV` gana sobre `ENVIRONMENT`

**Decisión:** `resolveEnvironment` prioriza `NODE_ENV`; `ENVIRONMENT` queda como
alias legacy.

**Motivo:** el ecosistema Node y las herramientas leen `NODE_ENV`. El backend
Python usaba `ENVIRONMENT`; mantenerlo evita romper `.env` existentes.

---

## D-04 — En producción no se leen archivos `.env`

**Decisión:** `ignoreEnvFile: process.env.NODE_ENV === 'production'`.

**Motivo:** en producción las variables vienen del proveedor. Un `.env` dentro de
la imagen es un riesgo de secretos y una fuente de configuración invisible.

---

## D-05 — El secreto de desarrollo se rechaza en producción

**Decisión:** la validación falla si `NODE_ENV=production` y `SECRET_KEY` es el
valor de ejemplo.

**Motivo:** evita desplegar con un secreto conocido (JWT falsificable).

---

## D-06 — `synchronize` automático solo en dev local

**Decisión:** `true` solo con `NODE_ENV=development` **y** host local; `false` en
producción; `DB_SYNCHRONIZE` explícito tiene prioridad.

**Motivo:** la base de Neon es compartida con producción y tiene datos reales.
Un `.env` de desarrollo apuntando a Neon no debe alterar el esquema.

**Riesgo:** habilitar `DB_SYNCHRONIZE=true` contra Neon puede borrar o alterar
columnas. No hacerlo.

---

## D-07 — `DATABASE_URL` tiene prioridad sobre `DB_*`

**Decisión:** si existe `DATABASE_URL`, se usa; las `DB_*` solo construyen la URL
cuando falta.

**Motivo:** Neon y los proveedores entregan una URL completa con SSL y parámetros.
Las variables sueltas quedan para PostgreSQL local.

---

## D-08 — `CORS_ORIGINS` se normaliza al leer

**Decisión:** `readList` separa por coma y quita la barra final.

**Motivo:** un origen con `/` al final no matchea en el header `Origin` y el
navegador bloquea la request. Se normaliza una sola vez, en configuración.
