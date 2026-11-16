# Spec 039 — Seed de desarrollo en TypeScript

| Campo   | Valor                                                                     |
| ------- | ------------------------------------------------------------------------- |
| Ticket  | MIG-39                                                                    |
| Epic    | MIG-11 — E10: Seed Script & Documentación                                 |
| Estado  | Implementada; revisión humana pendiente                                   |
| Alcance | Reemplazar `seed.py` por un comando idempotente que carga los datos base. |

## 1. Contexto

El backend legacy (FastAPI) trae un `seed.py` que deja la aplicación lista para
usar: dos usuarios, cuatro categorías, diez productos y doce mesas. Sin esos
datos el frontend no puede iniciar sesión ni operar, y el cutover (MIG-42) no
tiene una base reproducible.

La base de Neon es **compartida con producción**. Un seed que borre o duplique
datos puede romper el legacy, así que el comando debe ser seguro de re-ejecutar
y no debe poder dispararse contra producción por accidente.

Los datos exactos ya están congelados en
`test/utils/frontend-compat.fixtures.ts` (mismos valores que `seed.py`).

## 2. Fuera de alcance

- Cambiar el esquema de la base o ejecutar migraciones.
- Cargar datos de demostración distintos de los del legacy.
- Exponer HTTP, seeds automáticos al arrancar la aplicación o un panel de admin.
- Documentación general del proyecto y Swagger (MIG-40) y cutover (MIG-42).
- Truncar o actualizar datos existentes.

## 3. Historia de usuario

**Como** desarrollador del equipo de migración, **quiero** preparar una base de
desarrollo con los datos del legacy usando un solo comando, **para** probar el
backend nuevo y el frontend sin depender del `seed.py` de Python.

## 4. Requisitos funcionales

- **RF-01** CUANDO el seed se ejecuta sobre una base sin datos, EL SISTEMA DEBE
  insertar exactamente 2 usuarios, 4 categorías, 10 productos y 12 mesas.
- **RF-02** CUANDO se insertan los usuarios, EL SISTEMA DEBE guardarlos activos,
  con rol `admin` y `mozo`, y con la contraseña `123456` hasheada con bcrypt
  compatible con los hashes del legacy.
- **RF-03** CUANDO se insertan los productos, EL SISTEMA DEBE asociarlos por
  nombre a su categoría, guardar el precio como `numeric(10,2)`, el stock
  indicado, el stock mínimo 5 y `disponible = true`.
- **RF-04** CUANDO se insertan las mesas, EL SISTEMA DEBE numerarlas del 1 al 12
  y dejarlas en estado `libre`.
- **RF-05** SI una de las cuatro tablas ya tiene al menos una fila, ENTONCES EL
  SISTEMA DEBE omitir esa tabla y continuar con las demás.
- **RF-06** CUANDO el seed se ejecuta dos veces seguidas, EL SISTEMA DEBE dejar
  el mismo estado final, sin duplicar filas.
- **RF-07** SI un producto referencia una categoría que no existe, ENTONCES EL
  SISTEMA DEBE fallar con un mensaje accionable y no insertar productos.
- **RF-08** SI una inserción falla a mitad de la carga, ENTONCES EL SISTEMA DEBE
  revertir todos los cambios de esa ejecución.
- **RF-09** SI el entorno es `production` y no se habilitó explícitamente el
  seed, ENTONCES EL SISTEMA DEBE negarse a ejecutar antes de conectarse.
- **RF-10** EL SISTEMA DEBE ofrecer el comando `npm run seed`, ejecutable sobre
  `dist/` con el `.env` cargado, igual que los comandos de migración.
- **RF-11** CUANDO el seed termina, EL SISTEMA DEBE informar cuántas filas
  insertó y qué tablas omitió, sin exponer contraseñas ni hashes.

## 5. Requisitos no funcionales

- **RNF-01** Reutiliza `loadDatabaseConfig`/`createDataSourceOptions` y el
  `DataSource` del CLI: no duplica configuración ni crea una conexión paralela.
- **RNF-02** No agrega dependencias ni cambia el esquema (`synchronize: false`).
- **RNF-03** Imports relativos con `.js` (ESM + `nodenext`).
- **RNF-04** Sin `console.log`: usa el `Logger` de Nest.
- **RNF-05** Los tests unitarios no requieren PostgreSQL.

## 6. Casos límite y errores

| Caso                                   | Resultado                                            |
| -------------------------------------- | ---------------------------------------------------- |
| Base vacía                             | Inserta las 4 tablas                                 |
| Base ya sembrada completa              | No inserta nada; informa las 4 tablas omitidas       |
| Solo `usuarios` tiene filas            | Inserta categorías, productos y mesas                |
| Categorías existentes con otros ids    | Los productos se asocian por nombre, no por id fijo  |
| Falta una categoría referenciada       | Error accionable; no se insertan productos           |
| Falla una inserción intermedia         | Rollback completo                                    |
| `NODE_ENV=production` sin confirmación | Error antes de abrir conexión                        |
| `SEED_ALLOW_PRODUCTION=true`           | Se permite explícitamente                            |
| Dos ejecuciones simultáneas            | Una gana; la otra falla por restricciones y revierte |

## 7. Criterios de aceptación

- **CA-01** `npm run seed` carga los datos en una base vacía (RF-01..RF-04, RF-10).
- **CA-02** Una segunda ejecución no duplica datos (RF-05, RF-06).
- **CA-03** Los fallos dejan la base sin cambios parciales (RF-07, RF-08).
- **CA-04** El comando se niega a correr en producción sin confirmación (RF-09).
- **CA-05** `lint`, `typecheck`, unitarios, e2e y build en verde.
- **CA-06** La ejecución real queda registrada; si no hay base disponible, se
  informa explícitamente como no verificada.

## 8. Supuestos y preguntas abiertas

- Nombres de usuario, `stock_minimo = 5` y la categoría de cada producto se
  toman de `test/utils/frontend-compat.fixtures.ts`, que replica `seed.py`.
- La contraseña `123456` es la del entorno de desarrollo del legacy; no es un
  secreto de producción.
- El seed se ejecuta contra una base local o una branch de Neon de desarrollo.
  Producción queda bloqueada por defecto.
- El archivo vive en `src/database/seed.ts` (no en `src/seed.ts`) para compartir
  el `DataSource` y el patrón `dist/` de los comandos de migración.
- No hay preguntas que bloqueen la implementación.

## 9. Referencias

- MIG-39 — "Seed script en TypeScript (idempotente)".
- `grupo1/backend/seed.py` (legacy FastAPI).
- `test/utils/frontend-compat.fixtures.ts` §`seedCafecito`.
- ADR 0003, 0004, 0007 y 0009; Constitución §3, §5, §7 y §9.
- `src/database/README.md`, `src/database/DECISIONS.md`.
