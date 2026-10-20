# Cafecitoapp — Contrato de API (Backend NestJS)

| Campo | Valor |
| --- | --- |
| **Ticket** | MIG-17 — Definir contrato de API rediseñado (documento de endpoints) |
| **Epic** | MIG-1 — Bootcamp NestJS & Scaffolding del Proyecto |
| **Sprint** | S0 — Bootcamp |
| **Estado** | Propuesta — pendiente de validación por los 3 devs |
| **Backend destino** | `cafecito-mig-nest` (NestJS 12 · TypeScript 6 · TypeORM · PostgreSQL) |
| **Backend legacy** | FastAPI (Python) — operativo hasta el cutover (MIG-42) |
| **Versión del contrato** | `1.0.0` |
| **Spec formal** | [`docs/openapi.yaml`](./openapi.yaml) |

> **Cómo leer este documento.** El contrato **preserva paths, nombres de campos y shapes del backend legacy**; los cambios se limitan a los puntos transversales documentados en [§2](#2-decisiones-globales). Cada endpoint está marcado como **M** (mantener) o **R** (rediseñar). Un cambio **R** obliga a modificar el frontend (`frontend/types/api.ts`, stores y `frontend/lib/api.ts`); lo marcado **M** debe quedar **idéntico** al legacy.
>
> Fuentes usadas para este contrato: rutas y schemas del legacy (`backend/app/routes/*`, `backend/app/schemas/*`, `backend/main.py`), tipos y llamadas del frontend (`frontend/types/api.ts`, `frontend/lib/api.ts`, `frontend/stores/*`) y el scaffold NestJS (`src/`).

---

## Tabla de contenidos

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Decisiones globales](#2-decisiones-globales)
3. [Convenciones transversales](#3-convenciones-transversales)
4. [Roles y permisos](#4-roles-y-permisos)
5. [Modelo de errores](#5-modelo-de-errores)
6. [Inventario de endpoints](#6-inventario-de-endpoints)
7. [Schemas compartidos](#7-schemas-compartidos)
8. [Matriz de compatibilidad frontend ↔ backend](#8-matriz-de-compatibilidad-frontend--backend)
9. [Guía de implementación en NestJS](#9-guía-de-implementación-en-nestjs)
10. [Checklist de aceptación (MIG-17)](#10-checklist-de-aceptación-mig-17)
11. [Anexos](#11-anexos)

---

## 1. Resumen ejecutivo

La API actual tiene **32 endpoints** bajo `/api/v1` agrupados en **9 dominios**, más un **health check** en `GET /`. Este documento fija el contrato que debe exponer el backend NestJS durante la migración.

**Estrategia: compatibilidad primero.** El rediseño se limita a normalizar cuatro ejes transversales que hoy son frágiles o inconsistentes:

| Eje | Estado legacy | Contrato NestJS |
| --- | --- | --- |
| Errores | `{ "detail": "..." }` | **Igual** (se fuerza con un filtro global) |
| Validación | `422` + `detail` en español | **Igual** (`422`, no el `400` por defecto de NestJS) |
| Decimales | JSON `number` (Pydantic) | **Igual** (`number`; ojo con TypeORM/pg) |
| Fechas | UTC naive (`2026-10-19T20:24:10`) | **ISO-8601 UTC con `Z`** (`2026-10-19T20:24:10.000Z`) |
| Barra final | FastAPI redirigía `/mesas` → `/mesas/` | **Ambas formas responden igual, sin redirect** |

No se renombran recursos, no se cambia el versionado (`/api/v1` se mantiene), no se introduce envelope de paginación y no se migran acciones a otro estilo de URL. Esto minimiza el riesgo sobre el frontend en pleno sprint S0.

**Entregables:**
- Este documento (decisiones + inventario + matriz de compatibilidad).
- `docs/openapi.yaml` (OpenAPI 3.1, fuente formal del contrato).
- PR para validación de los 3 devs (criterio de aceptación del ticket).

---

## 2. Decisiones globales

Resumen para revisión rápida:

| ID | Decisión | Impacto frontend |
| --- | --- | --- |
| D-01 | Mantener base path `/api/v1`; health en `GET /` | Ninguno |
| D-02 | Todo error responde `{ "detail": string }` | Ninguno (ya lo espera) |
| D-03 | Validación responde **422** (no 400) | Ninguno (preserva clasificación) |
| D-04 | Colecciones aceptan con/sin barra final, sin redirect | Ninguno |
| D-05 | Montos y precios como **JSON number** | Ninguno (ya lo espera) |
| D-06 | Fechas **ISO-8601 UTC con `Z`** | Cambio de formato (fix de zona horaria) |
| D-07 | Códigos: crear `201`, borrar `204`, resto `200` | Ninguno |
| D-08 | JWT Bearer HS256, 480 min, roles `admin`/`mozo` | Ninguno |
| D-09 | `GET /caja/` devuelve `null` cuando no hay caja abierta | Condicionado (debe ser `null` literal) |
| D-10 | Sin paginación: las listas devuelven arrays | Ninguno |
| D-11 | Replicar header `X-Response-Time-ms` (opcional) | Ninguno |
| D-12 | IDs enteros autoincrementales | Ninguno |
| D-13 | Paths en kebab-case; JSON en `snake_case` | Ninguno |
| D-14 | Health check con shape nuevo de NestJS | Ninguno (el front no lo consume) |
| D-15 | `forgot-password` incluye `reset_token` solo en `development` | Ninguno |
| D-16 | CORS con orígenes configurables | Ninguno |

### D-01 — Base path `/api/v1`
- **Decisión:** mantener `/api/v1` para todos los recursos; el health check queda fuera (`GET /`).
- **Justificación:** el frontend ya apunta a `/api/v1` (`lib/api.ts`), versionar es buena práctica y eliminarlo no aporta valor en la migración.
- **Implementación:** `app.setGlobalPrefix('api/v1')` con exclusión del health, o un prefijo por controlador. Ver [§9](#9-guía-de-implementación-en-nestjs).

### D-02 — Envelope de error `{ "detail": string }`
- **Decisión:** **toda** respuesta de error (400/401/403/404/422/500) responde `{ "detail": "mensaje" }`. No se usa el default de NestJS `{ statusCode, message, error }`.
- **Justificación:** `frontend/lib/api.ts` lee exclusivamente `json.detail` y lo usa para mostrar el mensaje y clasificar el error. Un shape distinto rompe todos los flujos de error.
- **Nota:** las respuestas **exitosas** de acciones que no devuelven recurso (`change-password`, `reset-password`, `forgot-password`) usan `{ "message": "..." }`, tal como el legacy. Es un shape distinto y no debe confundirse con el de error.
- **Implementación:** `AllExceptionsFilter` global. Ver [§9](#9-guía-de-implementación-en-nestjs).

### D-03 — Validación con `422`
- **Decisión:** los errores de validación de DTO responden **422 Unprocessable Entity** con `{ "detail": "..." }` (un solo string, en español), igual que FastAPI.
- **Justificación:** `normalizeApiError` del front mapea `422 → "validacion"` y `400 → "negocio"`. Si NestJS devolviera 400, los errores de formulario se mostrarían como errores de negocio. Mantener 422 evita tocar el front.
- **Implementación:** `ValidationPipe` con `exceptionFactory` que lance `UnprocessableEntityException`. Ver [§9](#9-guía-de-implementación-en-nestjs).

### D-04 — Barra final en colecciones
- **Decisión:** `/mesas` y `/mesas/` (ídem `productos`, `pedidos`, `caja`, `categorias`, `empleados`) responden **igual**, sin redirect.
- **Justificación:** el front llama a las colecciones **con** barra final y a los ítems **sin** barra (verificado en los stores). El legacy lo resolvía con el redirect por defecto de Starlette; el contrato nuevo exige equivalencia nativa.
- **Implementación:** Express no usa `strict routing` por defecto; aun así, se debe cubrir con un test e2e que verifique `200` en ambas formas y ausencia de `301/307/308`.

### D-05 — Decimales como JSON `number`
- **Decisión:** `precio`, `total`, `subtotal`, `monto`, `monto_inicial`, `monto_final`, `total_vendido`, `ticket_promedio`, `diferencia`, etc. se serializan como **número JSON** (no string), con 2 decimales.
- **Justificación:** el front tipa y opera con `number` (`toLocaleString`, multiplicaciones). El legacy ya lo garantiza (`APIBaseModel` convierte `Decimal → float`).
- **Riesgo TypeORM:** en PostgreSQL, `numeric(10,2)` vuelve como **string** desde `pg` para preservar precisión. Hay que convertir en la capa de entidad/DTO. Ver [§9](#9-guía-de-implementación-en-nestjs).
- **Regla de cálculo:** internamente se recomienda calcular con `Decimal`/string y convertir a número **solo en la serialización**, para no acumular error de punto flotante en totales.

### D-06 — Fechas ISO-8601 UTC con `Z`
- **Decisión:** todas las fechas (`fecha`, `fecha_apertura`, `fecha_cierre`) se serializan como ISO-8601 UTC con sufijo `Z` y milisegundos, p. ej. `2026-10-19T20:24:10.000Z`.
- **Justificación:** el legacy guarda `datetime.utcnow` (UTC naive) y lo devuelve sin zona; el navegador lo interpreta como hora local y muestra las fechas **3 h adelantadas** en `America/Argentina/Buenos_Aires` (UTC-3). Con `Z`, `new Date(...)` interpreta correctamente y el render se corrige.
- **Impacto:** es un **cambio de formato intencional**; el front no requiere cambios de código (ya usa `new Date(...)`), pero **sí requiere QA visual** porque los horarios mostrarán 3 h menos (el valor correcto).
- **Implementación:** columnas `timestamptz` y serialización a ISO con `Date.toISOString()` (o interceptor global). Ver [§9](#9-guía-de-implementación-en-nestjs).

### D-07 — Códigos de estado
- **Decisión:** crear → `201`; eliminar → `204` (sin body); leer/actualizar/acciones → `200`. `POST /pedidos/{id}/pago` se mantiene en `200` (el legacy no devuelve 201).
- **Justificación:** coincide con el legacy y con lo que el front espera (maneja `204` sin body en `lib/api.ts`).

### D-08 — Autenticación y roles
- **Decisión:** `Authorization: Bearer <JWT>` (HS256, expiración 480 min por defecto). Roles `admin` y `mozo`. Usuario inactivo o token inválido → `401`.
- **Justificación:** es el esquema vigente del legacy; el front ya inyecta el header y maneja el `401`.

### D-09 — `GET /caja/` puede devolver `null`
- **Decisión:** cuando no hay caja abierta, responde `200` con body **`null`** (JSON literal), no `204` ni `{}`.
- **Justificación:** el legacy declara `CajaResponse | None` y el store hace `api.get<Caja | null>("/caja/")`.
- **Riesgo NestJS:** devolver `null` desde un controller puede terminar en body vacío (`res.send(null)`), que el front leería como `undefined`. Implementar explícitamente para emitir el literal `null`. Ver [§9](#9-guía-de-implementación-en-nestjs).

### D-10 — Sin paginación
- **Decisión:** las listas devuelven arrays completos. No se introduce `{ data, total }` ni `limit/offset` en esta migración.
- **Justificación:** el front asume arrays; introducir envelope es un rediseño que multiplica el impacto. Queda como mejora futura fuera del alcance de MIG-17.

### D-11 — Header `X-Response-Time-ms`
- **Decisión:** replicar el header en todas las respuestas mediante un interceptor (opcional, no bloqueante).
- **Justificación:** existe en el legacy (`main.py`); no se identificó consumo crítico en el front, por eso se marca opcional.

### D-12 — IDs
- **Decisión:** enteros autoincrementales (`id: number`), como el legacy.

### D-13 — Naming
- **Decisión:** paths en kebab-case (`change-password`, `forgot-password`, `reset-password`); campos JSON en `snake_case` (`access_token`, `metodo_pago`, `fecha_apertura`, `stock_minimo`, `categoria_id`). No se traducen ni se cambian a camelCase.

### D-14 — Health check
- **Decisión:** `GET /` responde el shape del scaffold NestJS:
  ```json
  { "status": "ok", "service": "backend-nest", "version": "0.0.1", "timestamp": "2026-10-19T23:00:00.000Z", "uptime": 12 }
  ```
- **Justificación:** el legacy devolvía `{ "message", "version" }`; el nuevo health es más informativo y ya está implementado en `src/health/`. El front no lo consume, por lo que no hay impacto.

### D-15 — `reset_token` en desarrollo
- **Decisión:** `POST /auth/forgot-password` devuelve `reset_token` (string) solo cuando `ENVIRONMENT=development`; en el resto, `null`. Se mantiene por utilidad de testing sin servicio de email.

### D-16 — CORS
- **Decisión:** orígenes configurables por entorno, con credenciales. Mantener `http://localhost:3000` en dev y la URL de producción (Vercel) por variable.
- **Nota:** el scaffold aún no configura CORS; se implementará en el ticket de bootstrap/config (MIG-19+).

### Decisiones de rediseño evaluadas y descartadas

| Propuesta | Por qué se descarta en S0 |
| --- | --- |
| Quitar `/api/v1` | Obliga a tocar `BASE_URL` y todas las llamadas; sin beneficio. |
| Pasar JSON a `camelCase` | Rompe todos los tipos y stores del front. |
| Envelope `{ data, total }` + paginación | Rediseño grande; el front asume arrays. |
| Cambiar `PATCH` por `PUT` | Sin beneficio funcional y rompe el contrato. |
| Modelar `caja/apertura` y `caja/cierre` como recursos | Cambio semántico sin impacto en el negocio; se mantiene como acción. |
| Devolver `404` en lugar de `400` para errores de negocio | El front clasifica distinto; se preserva la semántica del legacy. |

---

## 3. Convenciones transversales

| Tema | Convención |
| --- | --- |
| **Base URL (dev)** | `http://localhost:3000/api/v1` (NestJS). El legacy usaba `:8000`. |
| **Health** | `GET /` (fuera de `/api/v1`). |
| **Content-Type** | `application/json; charset=utf-8`. |
| **Auth** | `Authorization: Bearer <token>` en endpoints protegidos. |
| **Campos** | `snake_case`. |
| **Decimales** | número JSON, 2 decimales. |
| **Fechas** | ISO-8601 UTC con `Z`. |
| **Fechas de filtro** | `YYYY-MM-DD` (query `desde`/`hasta`). |
| **Null** | `null` explícito; nunca `undefined` ni campo omitido cuando el schema lo declara. |
| **Error** | `{ "detail": string }`. |
| **Mensaje de éxito** | `{ "message": string }` (solo acciones sin recurso). |
| **IDs** | enteros. |
| **Colecciones** | array JSON. |
| **Barra final** | equivalente con/sin barra en colecciones. |
| **Charset de mensajes** | español (igual que el legacy). |

---

## 4. Roles y permisos

| Rol | Descripción | Acceso |
| --- | --- | --- |
| `admin` | Administrador | Todos los endpoints. |
| `mozo` | Mozo / atención | Auth propio, mesas (lectura + estado), productos (lectura), categorías (lectura), pedidos (CRUD + estados). **No**: caja, dashboard, reportes, empleados, alta/edición/baja de productos, cobro. |

Leyenda de auth por endpoint:

| Símbolo | Significado |
| --- | --- |
| `público` | Sin token. |
| `auth` | Requiere token válido (cualquier rol). |
| `admin` | Requiere token válido y `rol = admin`. |

Matriz detallada:

| Grupo | Endpoint | Auth |
| --- | --- | --- |
| Auth | `POST /auth/login` | público |
| Auth | `POST /auth/register` | admin |
| Auth | `GET /auth/me` | auth |
| Auth | `PATCH /auth/me` | auth |
| Auth | `POST /auth/change-password` | auth |
| Auth | `POST /auth/forgot-password` | público |
| Auth | `POST /auth/reset-password` | público |
| Mesas | `GET /mesas/`, `GET /mesas/{id}` | auth |
| Mesas | `POST /mesas/` | admin |
| Mesas | `PATCH /mesas/{id}` | auth |
| Productos | `GET /productos/`, `GET /productos/{id}` | auth |
| Productos | `POST`, `PATCH`, `DELETE` | admin |
| Categorías | `GET /categorias/` | auth |
| Pedidos | `GET /pedidos/`, `GET /pedidos/{id}`, `POST /pedidos/`, `PATCH /pedidos/{id}` | auth |
| Pedidos | `POST /pedidos/{id}/pago` | admin |
| Caja | todos | admin |
| Dashboard | `GET /dashboard/resumen` | admin |
| Empleados | todos | admin |
| Reportes | `GET /reportes/ventas` | admin |
| Health | `GET /` | público |

---

## 5. Modelo de errores

### 5.1 Envelope

Toda respuesta no-2xx:

```json
{ "detail": "Mensaje legible en español" }
```

Sin campos adicionales (`statusCode`, `message`, `error`, `path`, `timestamp`). El front solo lee `detail`.

### 5.2 Catálogo

| Código | Cuándo | Ejemplo de `detail` |
| --- | --- | --- |
| `400` | Error de negocio / transición inválida / estado incompatible | `No se puede cambiar el estado de 'pagado' a 'cancelado'` |
| `401` | Token ausente, inválido o expirado; usuario inactivo | `Token inválido o expirado` |
| `403` | Autenticado sin permisos | `Se requiere rol de administrador` |
| `404` | Recurso inexistente | `Mesa no encontrada` |
| `422` | Validación de DTO | `Campo 'precio': debe ser mayor a 0` |
| `500` | Error inesperado | `Error interno del servidor` |

### 5.3 Errores de validación (422)

El legacy devuelve **un** mensaje (el primer error) con formato `Campo '<campo>': <mensaje>` y traducciones al español. El contrato mantiene ese formato:

```json
{ "detail": "Campo 'precio': debe ser mayor a 0" }
```

Reglas:
- Un solo string (no array).
- Prefijo `Campo '<nombre>':` cuando hay campo identificable.
- Mensajes en español.
- Código `422`.

### 5.4 Errores de autenticación

| Situación | Código | `detail` |
| --- | --- | --- |
| Login inválido | `401` | `Email o contraseña incorrectos` |
| Token inválido/expirado | `401` | `Token inválido o expirado` |
| Token sin `sub` | `401` | `Token sin identificador de usuario` |
| Usuario inexistente o inactivo | `401` | `Usuario no encontrado o inactivo` |
| Sin rol admin | `403` | `Se requiere rol de administrador` |

---

## 6. Inventario de endpoints

> **Convención:** todos los paths llevan el prefijo `/api/v1` salvo el health check. Los ejemplos de fecha usan el formato nuevo (`Z`); los montos son números.

### 6.1 Auth (7)

#### `POST /api/v1/auth/login` — M
- **Auth:** público
- **Body:** `LoginRequest`
- **Éxito:** `200` · `TokenResponse`
- **Errores:** `401`, `422`

Request:
```json
{ "email": "admin@cafecito.com", "password": "123456" }
```
Response `200`:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "usuario": { "id": 1, "nombre": "Nahuel Gauna", "email": "admin@cafecito.com", "rol": "admin", "activo": true }
}
```

#### `POST /api/v1/auth/register` — M
- **Auth:** admin
- **Body:** `UsuarioCreate`
- **Éxito:** `201` · `Usuario`
- **Errores:** `400` (`El email ya está registrado`), `401`, `403`, `422`

```json
// request
{ "nombre": "Valentín López", "email": "valentin@cafecito.com", "password": "123456", "rol": "mozo" }
```

#### `GET /api/v1/auth/me` — M
- **Auth:** auth
- **Éxito:** `200` · `Usuario`
- **Errores:** `401`

#### `PATCH /api/v1/auth/me` — M
- **Auth:** auth
- **Body:** `UsuarioUpdateProfile`
- **Éxito:** `200` · `Usuario`
- **Errores:** `400` (`El email ya está en uso por otro usuario`), `401`, `422`

```json
{ "nombre": "Valentín López", "email": "valentin@cafecito.com" }
```

#### `POST /api/v1/auth/change-password` — M
- **Auth:** auth
- **Body:** `ChangePasswordRequest`
- **Éxito:** `200` · `MessageResponse`
- **Errores:** `400` (`La contraseña actual es incorrecta`), `401`, `422`

```json
// request
{ "password_actual": "123456", "password_nueva": "nuevoSecreto456" }
// response 200
{ "message": "Contraseña actualizada correctamente" }
```

#### `POST /api/v1/auth/forgot-password` — M
- **Auth:** público
- **Body:** `ForgotPasswordRequest`
- **Éxito:** `200` · `ForgotPasswordResponse`
- **Errores:** `422`
- **Nota:** `reset_token` solo se completa en `development` (D-15).

```json
// request
{ "email": "valentin@cafecito.com" }
// response 200 (dev)
{
  "message": "Si el email está registrado, vas a recibir instrucciones para recuperar tu contraseña.",
  "reset_token": "eyJhbGciOi..."
}
```

#### `POST /api/v1/auth/reset-password` — M
- **Auth:** público
- **Body:** `ResetPasswordRequest`
- **Éxito:** `200` · `MessageResponse`
- **Errores:** `400` (`Token inválido o expirado`), `422`

```json
// request
{ "token": "eyJhbGciOi...", "password_nueva": "nuevoSecreto456" }
// response 200
{ "message": "Contraseña restablecida correctamente" }
```

---

### 6.2 Mesas (4)

Estados: `libre` · `ocupada` · `reservada` · `pendiente_cobro` · `en_limpieza`.

Transiciones permitidas (manuales):
| Desde | Hacia |
| --- | --- |
| `libre` | `ocupada`, `reservada` |
| `reservada` | `ocupada`, `libre` |
| `ocupada` | `en_limpieza` |
| `pendiente_cobro` | `ocupada` |
| `en_limpieza` | `libre` |

> `ocupada → pendiente_cobro` ocurre **solo** como efecto de pasar el pedido a `entregado`, y `pendiente_cobro → libre` **solo** al cobrar. No son transiciones manuales.

#### `GET /api/v1/mesas/` — M
- **Auth:** auth
- **Éxito:** `200` · `Mesa[]`
- **Errores:** `401`

```json
[
  { "id": 1, "numero": 1, "estado": "libre" },
  { "id": 2, "numero": 2, "estado": "ocupada" }
]
```

#### `GET /api/v1/mesas/{id}` — M
- **Auth:** auth
- **Éxito:** `200` · `Mesa`
- **Errores:** `401`, `404` (`Mesa no encontrada`)

#### `POST /api/v1/mesas/` — M
- **Auth:** admin
- **Body:** `MesaCreate`
- **Éxito:** `201` · `Mesa`
- **Errores:** `400` (`Ya existe una mesa con el número N`), `401`, `403`, `422`

```json
// request
{ "numero": 13 }
// response 201
{ "id": 13, "numero": 13, "estado": "libre" }
```

#### `PATCH /api/v1/mesas/{id}` — M
- **Auth:** auth
- **Body:** `MesaUpdate`
- **Éxito:** `200` · `Mesa`
- **Errores:** `400` (`No se puede cambiar el estado de 'X' a 'Y'`; `No se puede pasar la mesa a limpieza: tiene un pedido activo sin cobrar...`), `401`, `404`, `422`

```json
// request
{ "estado": "ocupada" }
```

---

### 6.3 Productos (5)

#### `GET /api/v1/productos/` — M
- **Auth:** auth
- **Éxito:** `200` · `Producto[]`
- **Errores:** `401`

```json
[
  {
    "id": 1,
    "nombre": "Café con leche",
    "descripcion": "Café espresso con leche vaporizada",
    "precio": 850.0,
    "stock": 50,
    "stock_minimo": 5,
    "disponible": true,
    "categoria": { "id": 1, "nombre": "Bebidas" }
  }
]
```

#### `GET /api/v1/productos/{id}` — M
- **Auth:** auth
- **Éxito:** `200` · `Producto`
- **Errores:** `401`, `404` (`Producto no encontrado`)

#### `POST /api/v1/productos/` — M
- **Auth:** admin
- **Body:** `ProductoCreate`
- **Éxito:** `201` · `Producto`
- **Errores:** `400` (`La categoría indicada no existe`), `401`, `403`, `422`

```json
{
  "nombre": "Tostado mixto",
  "descripcion": "Jamón y queso gratinado",
  "precio": 2200.0,
  "stock": 30,
  "stock_minimo": 5,
  "disponible": true,
  "categoria_id": 2
}
```

#### `PATCH /api/v1/productos/{id}` — M
- **Auth:** admin
- **Body:** `ProductoUpdate`
- **Éxito:** `200` · `Producto`
- **Errores:** `400`, `401`, `403`, `404`, `422`

#### `DELETE /api/v1/productos/{id}` — M
- **Auth:** admin
- **Éxito:** `204` (sin body)
- **Errores:** `400` (`No se puede eliminar: el producto tiene pedidos asociados. Marcalo como no disponible en su lugar.`), `401`, `403`, `404`
- **Nota:** el front ya maneja `204` sin body (`lib/api.ts`).

---

### 6.4 Categorías (1)

#### `GET /api/v1/categorias/` — M
- **Auth:** auth
- **Éxito:** `200` · `Categoria[]`
- **Errores:** `401`

```json
[ { "id": 1, "nombre": "Bebidas" }, { "id": 2, "nombre": "Comida" } ]
```
> Solo lectura. El alta/edición/baja de categorías queda fuera del alcance (legacy).

---

### 6.5 Pedidos (5)

Estados: `pendiente` · `en_preparacion` · `listo` · `entregado` · `pagado` · `cancelado`.

Transiciones manuales (`PATCH`):
| Desde | Hacia |
| --- | --- |
| `pendiente` | `en_preparacion`, `cancelado` |
| `en_preparacion` | `listo`, `cancelado` |
| `listo` | `entregado`, `cancelado` |
| `entregado` | `cancelado` |
| `pagado` | — |
| `cancelado` | — |

> `entregado → pagado` **no** es manual: solo ocurre por `POST /pedidos/{id}/pago`.

#### `GET /api/v1/pedidos/` — M
- **Auth:** auth
- **Éxito:** `200` · `Pedido[]` (solo activos: no `pagado` ni `cancelado`)
- **Errores:** `401`

Format:
```json
[
  {
    "id": 10,
    "estado": "pendiente",
    "total": 300.0,
    "fecha": "2026-10-19T20:24:10.000Z",
    "mesa": { "id": 1, "numero": 5, "estado": "ocupada" },
    "usuario": { "id": 2, "nombre": "Valentín", "email": "valentin@example.com", "rol": "mozo", "activo": true },
    "detalles": [
      { "id": 1, "producto_id": 1, "cantidad": 2, "subtotal": 300.0 }
    ]
  }
]
```

#### `GET /api/v1/pedidos/{id}` — M
- **Auth:** auth
- **Éxito:** `200` · `Pedido`
- **Errores:** `401`, `404` (`Pedido no encontrado`)

#### `POST /api/v1/pedidos/` — M
- **Auth:** auth
- **Body:** `PedidoCreate`
- **Éxito:** `201` · `Pedido`
- **Errores:** `400` (negocio), `401`, `422`
- **Reglas de negocio:**
  - La mesa debe existir.
  - La mesa no puede tener un pedido activo.
  - Cada producto debe existir y estar `disponible`.
  - Debe haber stock suficiente; se descuenta stock.
  - El total se calcula como suma de `precio × cantidad`.
  - La mesa pasa a `ocupada`.

```json
// request
{ "mesa_id": 1, "detalles": [ { "producto_id": 1, "cantidad": 2 } ] }
```
Errores de negocio posibles (`400`):
`Mesa N no encontrada`, `La mesa ya tiene un pedido activo`, `Producto N no encontrado`, `Producto N no disponible`, `Stock insuficiente para 'Nombre' (disponible: X, solicitado: Y)`.

#### `PATCH /api/v1/pedidos/{id}` — M
- **Auth:** auth
- **Body:** `PedidoUpdate`
- **Éxito:** `200` · `Pedido`
- **Errores:** `400` (`No se puede cambiar el estado de 'X' a 'Y'`), `401`, `404`, `422`
- **Efectos sobre la mesa:** `entregado → pendiente_cobro`; `cancelado → libre`; estados activos → `ocupada`.

```json
{ "estado": "en_preparacion" }
```

#### `POST /api/v1/pedidos/{id}/pago` — M
- **Auth:** admin
- **Body:** `PedidoPagoRequest`
- **Éxito:** `200` · `Pedido`
- **Errores:** `400` (`Solo se puede cobrar un pedido en estado 'entregado' (estado actual: 'X')`; `No se puede cobrar un pedido sin una caja abierta`), `401`, `403`, `404`, `422`
- **Reglas:** requiere pedido `entregado` y caja abierta; crea `Pago` por el total, marca `pagado` y libera la mesa. No hay cobros parciales.

```json
{ "metodo_pago": "efectivo" }
```

---

### 6.6 Caja (5)

#### `GET /api/v1/caja/` — M
- **Auth:** admin
- **Éxito:** `200` · `Caja | null`
- **Errores:** `401`, `403`
- **Nota:** devuelve **`null`** si no hay caja abierta (D-09).

```json
{
  "id": 1,
  "fecha_apertura": "2026-10-19T11:00:00.000Z",
  "fecha_cierre": null,
  "monto_inicial": 1000.0,
  "monto_final": null,
  "estado": "abierta",
  "total_ventas": 2500.0
}
```

#### `GET /api/v1/caja/historial` — M
- **Auth:** admin
- **Éxito:** `200` · `Caja[]` (más reciente primero)
- **Errores:** `401`, `403`

#### `GET /api/v1/caja/{id}/movimientos` — M
- **Auth:** admin
- **Éxito:** `200` · `MovimientoCaja[]`
- **Errores:** `401`, `403`, `404` (`Caja no encontrada`)

```json
[
  {
    "id": 5,
    "fecha": "2026-10-19T16:45:00.000Z",
    "pedido_id": 12,
    "mesa_numero": 4,
    "monto": 950.0,
    "metodo_pago": "efectivo",
    "usuario_nombre": "Valentín"
  }
]
```

#### `POST /api/v1/caja/apertura` — M
- **Auth:** admin
- **Body:** `CajaApertura`
- **Éxito:** `201` · `Caja`
- **Errores:** `400` (`Ya hay una caja abierta`), `401`, `403`, `422`

```json
{ "monto_inicial": 1000.0 }
```

#### `POST /api/v1/caja/cierre` — M
- **Auth:** admin
- **Body:** `CajaCierre`
- **Éxito:** `200` · `Caja`
- **Errores:** `400` (`No hay una caja abierta`), `401`, `403`, `422`

```json
{ "monto_final": 3500.0 }
```

---

### 6.7 Dashboard (1)

#### `GET /api/v1/dashboard/resumen` — M
- **Auth:** admin
- **Éxito:** `200` · `DashboardResumen`
- **Errores:** `401`, `403`

```json
{
  "ventas_dia": { "total": 12500.0, "pagos": 8 },
  "mesas": { "total": 12, "libres": 5, "ocupadas": 4, "pendientes_cobro": 3 },
  "pedidos_activos": { "total": 7, "pendientes": 2, "en_preparacion": 2, "listos": 1, "entregados": 2 },
  "caja": { "estado": "abierta", "monto_inicial": 5000.0, "fecha_apertura": "2026-10-19T11:00:00.000Z" },
  "ultimos_pedidos": [
    { "id": 15, "mesa": 5, "items": 3, "total": 4500.0, "estado": "entregado" }
  ]
}
```

---

### 6.8 Empleados (3)

> `Empleados` opera sobre la misma entidad `Usuario`. El alta **siempre** crea `rol = mozo`; no se permite elegir ni cambiar rol desde estos endpoints.

#### `GET /api/v1/empleados/` — M
- **Auth:** admin
- **Éxito:** `200` · `Usuario[]`
- **Errores:** `401`, `403`

#### `POST /api/v1/empleados/` — M
- **Auth:** admin
- **Body:** `EmpleadoCreate`
- **Éxito:** `201` · `Usuario`
- **Errores:** `400` (`El email ya está registrado`), `401`, `403`, `422`

```json
{ "nombre": "Valentín", "email": "valentin@example.com", "password": "secreto123" }
```

#### `PATCH /api/v1/empleados/{id}` — M
- **Auth:** admin
- **Body:** `EmpleadoUpdate`
- **Éxito:** `200` · `Usuario`
- **Errores:** `400` (`El email ya está en uso por otro usuario`; `No podés desactivar tu propio usuario`), `401`, `403`, `404` (`Empleado no encontrado`), `422`

```json
{ "activo": false }
```

---

### 6.9 Reportes (1)

#### `GET /api/v1/reportes/ventas?desde=YYYY-MM-DD&hasta=YYYY-MM-DD` — M
- **Auth:** admin
- **Query:** `desde` (date, requerido, inclusive), `hasta` (date, requerido, inclusive)
- **Éxito:** `200` · `ReporteVentasResponse`
- **Errores:** `400` (`La fecha 'desde' no puede ser posterior a 'hasta'`), `401`, `403`, `422`

```json
{
  "periodo": { "desde": "2026-10-01", "hasta": "2026-10-19" },
  "resumen": { "total_vendido": 125000.0, "cantidad_cobros": 84, "pedidos_cobrados": 80, "ticket_promedio": 1488.1 },
  "ventas_por_metodo": [ { "metodo_pago": "efectivo", "cantidad": 40, "total": 60000.0 } ],
  "productos_mas_vendidos": [ { "producto_id": 1, "nombre": "Café con leche", "cantidad": 120, "total": 102000.0 } ],
  "mesas_utilizadas": [ { "mesa_id": 1, "numero": 1, "cantidad_pedidos": 18, "total": 27000.0 } ],
  "cajas": [
    {
      "caja_id": 1,
      "estado": "cerrada",
      "fecha_apertura": "2026-10-18T11:00:00.000Z",
      "fecha_cierre": "2026-10-18T23:00:00.000Z",
      "monto_inicial": 1000.0,
      "ventas_efectivo": 40000.0,
      "monto_final": 41500.0,
      "diferencia": 500.0
    }
  ]
}
```

---

### 6.10 Health check (1)

#### `GET /` — R
- **Auth:** público
- **Éxito:** `200` · `HealthStatus`
- **Nota:** fuera de `/api/v1`. Shape nuevo (D-14).

```json
{ "status": "ok", "service": "backend-nest", "version": "0.0.1", "timestamp": "2026-10-19T23:00:00.000Z", "uptime": 12 }
```

---

## 7. Schemas compartidos

> Los nombres coinciden con `frontend/types/api.ts` donde aplica. `?` = opcional.

### Auth / Usuarios

```ts
type Rol = "admin" | "mozo";

interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
  activo: boolean;
}

interface UsuarioCreate {
  nombre: string;
  email: string;          // formato email
  password: string;
  rol: Rol;
}

interface UsuarioUpdateProfile {
  nombre?: string;
  email?: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface TokenResponse {
  access_token: string;
  token_type: string;     // "bearer"
  usuario: Usuario;
}

interface ChangePasswordRequest {
  password_actual: string;
  password_nueva: string; // min 6
}

interface ForgotPasswordRequest {
  email: string;
}

interface ForgotPasswordResponse {
  message: string;
  reset_token: string | null;
}

interface ResetPasswordRequest {
  token: string;
  password_nueva: string; // min 6
}

interface MessageResponse {
  message: string;
}

interface EmpleadoCreate {
  nombre: string;
  email: string;
  password: string;       // min 6
}

interface EmpleadoUpdate {
  nombre?: string;
  email?: string;
  activo?: boolean;
}
```

### Categorías / Productos

```ts
interface Categoria {
  id: number;
  nombre: string;
}

interface Producto {
  id: number;
  nombre: string;
  descripcion: string | null;
  precio: number;         // number, 2 decimales
  stock: number;
  stock_minimo: number;
  disponible: boolean;
  categoria: Categoria;
}

interface ProductoCreate {
  nombre: string;         // min 1
  descripcion?: string | null;
  precio: number;         // > 0
  stock: number;          // >= 0 (default 0)
  stock_minimo: number;   // >= 0 (default 5)
  disponible: boolean;    // default true
  categoria_id: number;
}

interface ProductoUpdate {
  nombre?: string;
  descripcion?: string | null;
  precio?: number;        // > 0
  stock?: number;         // >= 0
  stock_minimo?: number;  // >= 0
  disponible?: boolean;
  categoria_id?: number;
}
```

### Mesas

```ts
type MesaEstado = "libre" | "ocupada" | "reservada" | "pendiente_cobro" | "en_limpieza";

interface Mesa {
  id: number;
  numero: number;
  estado: MesaEstado;
}

interface MesaCreate {
  numero: number;         // > 0
}

interface MesaUpdate {
  estado: MesaEstado;
}
```

### Pedidos / Pagos

```ts
type PedidoEstado =
  | "pendiente" | "en_preparacion" | "listo"
  | "entregado" | "pagado" | "cancelado";

type MetodoPago =
  | "efectivo" | "debito" | "credito" | "transferencia" | "mercado_pago";

interface DetallePedido {
  id: number;
  producto_id: number;
  cantidad: number;
  subtotal: number;
}

interface Pedido {
  id: number;
  estado: PedidoEstado;
  total: number;
  fecha: string;          // ISO-8601 UTC con Z
  mesa: Mesa;
  usuario: Usuario;
  detalles: DetallePedido[];
}

interface DetallePedidoCreate {
  producto_id: number;
  cantidad: number;       // > 0
}

interface PedidoCreate {
  mesa_id: number;
  detalles: DetallePedidoCreate[]; // min 1
}

interface PedidoUpdate {
  estado: PedidoEstado;
}

interface PedidoPagoRequest {
  metodo_pago: MetodoPago;
}
```

### Caja

```ts
type CajaEstado = "abierta" | "cerrada";

interface Caja {
  id: number;
  fecha_apertura: string; // ISO-8601 UTC con Z
  fecha_cierre: string | null;
  monto_inicial: number;
  monto_final: number | null;
  estado: CajaEstado;
  total_ventas: number;
}

interface CajaApertura {
  monto_inicial: number;
}

interface CajaCierre {
  monto_final: number;
}

interface MovimientoCaja {
  id: number;
  fecha: string;
  pedido_id: number;
  mesa_numero: number;
  monto: number;
  metodo_pago: MetodoPago;
  usuario_nombre: string | null;
}
```

### Dashboard

```ts
interface DashboardVentasDia { total: number; pagos: number; }
interface DashboardMesasResumen { total: number; libres: number; ocupadas: number; pendientes_cobro: number; }
interface DashboardPedidosActivos { total: number; pendientes: number; en_preparacion: number; listos: number; entregados: number; }
interface DashboardCajaEstado { estado: string; monto_inicial: number | null; fecha_apertura: string | null; }
interface DashboardUltimoPedido { id: number; mesa: number; items: number; total: number; estado: string; }

interface DashboardResumen {
  ventas_dia: DashboardVentasDia;
  mesas: DashboardMesasResumen;
  pedidos_activos: DashboardPedidosActivos;
  caja: DashboardCajaEstado;
  ultimos_pedidos: DashboardUltimoPedido[];
}
```

### Reportes

```ts
interface ReportePeriodo { desde: string; hasta: string; }
interface ReporteResumen { total_vendido: number; cantidad_cobros: number; pedidos_cobrados: number; ticket_promedio: number; }
interface ReporteVentasMetodo { metodo_pago: string; cantidad: number; total: number; }
interface ReporteProductoVendido { producto_id: number; nombre: string; cantidad: number; total: number; }
interface ReporteMesaUtilizada { mesa_id: number; numero: number; cantidad_pedidos: number; total: number; }
interface ReporteCajaDetalle {
  caja_id: number;
  estado: string;
  fecha_apertura: string;
  fecha_cierre: string | null;
  monto_inicial: number;
  ventas_efectivo: number;
  monto_final: number | null;
  diferencia: number | null;
}

interface ReporteVentasResponse {
  periodo: ReportePeriodo;
  resumen: ReporteResumen;
  ventas_por_metodo: ReporteVentasMetodo[];
  productos_mas_vendidos: ReporteProductoVendido[];
  mesas_utilizadas: ReporteMesaUtilizada[];
  cajas: ReporteCajaDetalle[];
}
```

### Errores / Health

```ts
interface ErrorResponse {
  detail: string;
}

interface HealthStatus {
  status: "ok";
  service: string;
  version: string;
  timestamp: string;
  uptime: number;
}
```

---

## 8. Matriz de compatibilidad frontend ↔ backend

Leyenda de impacto:
- **Sin cambio:** el front no requiere modificación.
- **Condicionado:** sin cambio *si* el backend cumple la decisión indicada.
- **Cambio:** requiere ajuste o QA en el front.

| Endpoint | Tipo front (`types/api.ts`) | Consumo (store) | Impacto |
| --- | --- | --- | --- |
| `POST /auth/login` | `TokenResponse` | `authStore.login` | Sin cambio |
| `POST /auth/register` | `Usuario` | (no consumido por store) | Sin cambio |
| `GET /auth/me` | `Usuario` | `authStore.fetchMe` | Sin cambio |
| `PATCH /auth/me` | `Usuario` | `authStore.updateProfile` | Sin cambio |
| `POST /auth/change-password` | `MessageResponse` | `authStore.changePassword` | Sin cambio |
| `POST /auth/forgot-password` | `ForgotPasswordResponse` | `authStore.forgotPassword` | Sin cambio |
| `POST /auth/reset-password` | `MessageResponse` | `authStore.resetPassword` | Sin cambio |
| `GET /mesas/` | `Mesa[]` | `mesaStore.cargarMesas` | Sin cambio (D-04) |
| `GET /mesas/{id}` | `Mesa` | — | Sin cambio |
| `POST /mesas/` | `Mesa` | `mesaStore.crearMesa` | Sin cambio |
| `PATCH /mesas/{id}` | `Mesa` | `mesaStore.cambiarEstado` | Sin cambio |
| `GET /productos/` | `Producto[]` | `productoStore`, `carritoStore` | Sin cambio |
| `GET /productos/{id}` | `Producto` | — | Sin cambio |
| `POST /productos/` | `Producto` | `productoStore.crearProducto` | Sin cambio |
| `PATCH /productos/{id}` | `Producto` | `productoStore.actualizarProducto` | Sin cambio |
| `DELETE /productos/{id}` | `void` (`204`) | `productoStore.eliminarProducto` | Sin cambio |
| `GET /categorias/` | `Categoria[]` | `productoStore.cargarCategorias` | Sin cambio |
| `GET /pedidos/` | `Pedido[]` | `pedidoStore.cargarPedidos` | Sin cambio |
| `GET /pedidos/{id}` | `Pedido` | — | Sin cambio |
| `POST /pedidos/` | `Pedido` | `carritoStore.confirmarPedido` | Sin cambio |
| `PATCH /pedidos/{id}` | `Pedido` | `pedidoStore.cambiarEstado` | Sin cambio |
| `POST /pedidos/{id}/pago` | `Pedido` | `pedidoStore.cobrarPedido` | Sin cambio |
| `GET /caja/` | `Caja \| null` | `cajaStore.cargarCaja` | **Condicionado** (D-09: `null` literal) |
| `GET /caja/historial` | `Caja[]` | `cajaStore.cargarHistorial` | Sin cambio |
| `GET /caja/{id}/movimientos` | `MovimientoCaja[]` | `cajaStore.cargarMovimientos` | Sin cambio |
| `POST /caja/apertura` | `Caja` | `cajaStore.abrirCaja` | Sin cambio |
| `POST /caja/cierre` | `Caja` | `cajaStore.cerrarCaja` | Sin cambio |
| `GET /dashboard/resumen` | `DashboardResumen` | `dashboardStore.cargarResumen` | Sin cambio |
| `GET /empleados/` | `Usuario[]` | `empleadoStore.cargarEmpleados` | Sin cambio |
| `POST /empleados/` | `Usuario` | `empleadoStore.crearEmpleado` | Sin cambio |
| `PATCH /empleados/{id}` | `Usuario` | `empleadoStore.actualizarEmpleado` | Sin cambio |
| `GET /reportes/ventas` | `ReporteVentasResponse` | `reportesStore.cargarReporte` | Sin cambio |
| `GET /` | — | — | Sin cambio |

### 8.1 Riesgos de compatibilidad y mitigaciones

| # | Riesgo | Mitigación / decisión |
| --- | --- | --- |
| 1 | **Validación 400 vs 422** | Mantener `422` (D-03). Si se usara 400, `normalizeApiError` clasificaría como `negocio` y habría que tocar el front. |
| 2 | **Error shape** | Filtro global que emite `{ detail }` (D-02). Sin esto, todos los mensajes de error del front se degradan a `Error <status>`. |
| 3 | **`GET /caja/` con body vacío** | Garantizar `null` literal; si NestJS envía body vacío, el front recibe `undefined` (funciona por falsy, pero rompe el tipo y tests estrictos). |
| 4 | **Decimales como string** | Transformer de TypeORM → `number` (D-05). Sin esto, `toLocaleString` y multiplicaciones fallan. |
| 5 | **Fechas sin `Z`** | Serializar ISO con `Z` (D-06). Cambia el render 3 h; requiere QA visual. |
| 6 | **Barra final** | Test e2e de equivalencia y no-redirect (D-04). |
| 7 | **`204` sin body** | `DELETE` debe devolver 204 real; el front ya lo maneja. |
| 8 | **`reset_token` en dev** | Solo en `development`; el front lo tipa como `string \| null`. |
| 9 | **`X-Response-Time-ms`** | Opcional; si se omite, no hay impacto funcional identificado. |

---

## 9. Guía de implementación en NestJS

Esta sección orienta cómo materializar el contrato en el scaffold. **No forma parte del entregable de MIG-17** (es guía para los tickets de implementación), pero evita decisiones ambiguas.

### 9.1 Prefijo global y health fuera del prefijo

`setGlobalPrefix` aplica a todas las rutas. Para dejar `GET /` fuera, excluir el health:

```ts
// src/main.ts
app.setGlobalPrefix('api/v1', { exclude: ['/'] });
```

### 9.2 Validación con 422 y mensaje en español

```ts
// src/common/pipes/validation.pipe.ts (o en main.ts)
import { UnprocessableEntityException, ValidationPipe } from '@nestjs/common';

app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    // Pydantic (legacy) ignora campos extra; no endurecer el contrato.
    forbidNonWhitelisted: false,
    transform: true,
    exceptionFactory: (errors) => {
      // Tomar el primer error y armar "Campo '<campo>': <mensaje>"
      const first = errors[0];
      const field = first?.property ?? '';
      const message = first?.constraints
        ? Object.values(first.constraints)[0]
        : 'Datos inválidos';
      return new UnprocessableEntityException(
        field ? `Campo '${field}': ${message}` : message,
      );
    },
  }),
);
```

> `UnprocessableEntityException` garantiza `422`. No depender del `400` por defecto.

### 9.3 Filtro global de excepciones → `{ detail }`

```ts
// src/common/filters/all-exceptions.filter.ts
import {
  ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let detail = 'Error interno del servidor';
    if (exception instanceof HttpException) {
      const payload = exception.getResponse();
      if (typeof payload === 'string') {
        detail = payload;
      } else if (payload && typeof payload === 'object') {
        const anyPayload = payload as Record<string, unknown>;
        // HttpException estándar de Nest: { message, error, statusCode }
        const message = anyPayload.message;
        detail = Array.isArray(message)
          ? String(message[0])
          : typeof message === 'string'
            ? message
            : exception.message;
      }
    }

    res.status(status).json({ detail });
  }
}
```

Registro global (con DI) en `AppModule`:

```ts
import { APP_FILTER } from '@nestjs/core';

@Module({
  providers: [{ provide: APP_FILTER, useClass: AllExceptionsFilter }],
})
export class AppModule {}
```

### 9.4 Decimales `numeric` → `number`

`pg` devuelve `numeric`/`decimal` como string. Usar un transformer de columna:

```ts
// src/common/transformers/numeric.transformer.ts
import type { ValueTransformer } from 'typeorm';

export const numericTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) => (value === null || value === undefined ? value : Number(value)),
};
```

Uso en entidades:

```ts
@Column('numeric', { precision: 10, scale: 2, transformer: numericTransformer })
precio!: number;
```

> Alternativa: mantener `Decimal` internamente y convertir en el DTO de salida. Lo importante es que **el JSON final sea `number`**.

### 9.5 Fechas ISO-8601 con `Z`

1. Modelar las columnas como `timestamptz` (`@Column({ type: 'timestamptz' })`).
2. Serializar con `toISOString()` (incluye `Z` y milisegundos).
3. Si se usa `class-transformer`, `@Transform(({ value }) => value?.toISOString())`; o un interceptor global que recorra el body y convierta `Date` a ISO.

### 9.6 `GET /caja/` con `null` literal

En NestJS, `return null` puede terminar en body vacío. Para emitir el literal JSON `null`:

```ts
@Get()
async estado(@Res() res: Response): Promise<void> {
  const caja = await this.cajaService.getAbierta();
  res.status(HttpStatus.OK).json(caja); // json(null) => "null"
}
```

> Verificar con e2e que el body sea exactamente `null`.

### 9.7 Barra final

- Express no usa `strict routing` por defecto, por lo que `/mesas` y `/mesas/` deberían matchear la misma ruta.
- No habilitar `strict routing`.
- Cubrir con e2e: `GET /api/v1/mesas` y `GET /api/v1/mesas/` → `200`, sin `3xx`.

### 9.8 Header `X-Response-Time-ms` (opcional)

Interceptor global que mida el tiempo y setee el header antes de responder.

### 9.9 CORS

```ts
app.enableCors({
  origin: config.get<string>('CORS_ORIGINS')?.split(',').map((o) => o.trim().replace(/\/$/, '')),
  credentials: true,
});
```

### 9.10 Mapa de módulos del scaffold

| Grupo | Módulo NestJS |
| --- | --- |
| Auth | `src/auth` |
| Usuarios / Empleados | `src/users`, `src/empleados` |
| Mesas | `src/mesas` |
| Categorías | `src/categorias` |
| Productos | `src/productos` |
| Pedidos / Pagos | `src/pedidos`, `src/pagos` |
| Caja | `src/caja` |
| Dashboard | `src/dashboard` |
| Reportes | `src/reportes` |
| Health | `src/health` |

---

## 10. Checklist de aceptación (MIG-17)

- [x] Documento completo con los **32 endpoints + health check**.
- [x] Decisiones de rediseño **justificadas** (D-01 a D-16) y propuestas para aceptación de los 3 devs.
- [x] **Matriz de compatibilidad** frontend ↔ backend identificada (incluye riesgos y mitigaciones).
- [x] Formato de **errores**, **barra final**, **decimales** y **fechas** definidos en el contrato.
- [x] Spec formal `docs/openapi.yaml` alineada 1:1 con este documento.
- [ ] Aprobación explícita de los 3 devs (pendiente de review del PR).

### 10.1 Aprobaciones

| Dev | Rol | Fecha | ¿Aprueba? |
| --- | --- | --- | --- |
| Dev 1 | Backend | | [ ] |
| Dev 2 | Backend / Frontend | | [ ] |
| Dev 3 | Backend / QA | | [ ] |

---

## 11. Anexos

### 11.1 Enums

| Enum | Valores |
| --- | --- |
| `Rol` | `admin`, `mozo` |
| `MesaEstado` | `libre`, `ocupada`, `reservada`, `pendiente_cobro`, `en_limpieza` |
| `PedidoEstado` | `pendiente`, `en_preparacion`, `listo`, `entregado`, `pagado`, `cancelado` |
| `CajaEstado` | `abierta`, `cerrada` |
| `MetodoPago` | `efectivo`, `debito`, `credito`, `transferencia`, `mercado_pago` |

### 11.2 Transiciones de estado

**Pedido (manual, `PATCH`):**
```
pendiente      → en_preparacion | cancelado
en_preparacion → listo | cancelado
listo          → entregado | cancelado
entregado      → cancelado
pagado         → (final)
cancelado      → (final)

entregado --(POST /pago)--> pagado
```

**Mesa (manual, `PATCH`):**
```
libre          → ocupada | reservada
reservada      → ocupada | libre
ocupada        → en_limpieza
pendiente_cobro→ ocupada
en_limpieza    → libre

ocupada --(pedido entregado)--> pendiente_cobro
pendiente_cobro --(cobro)--> libre
```

### 11.3 Glosario

| Término | Significado |
| --- | --- |
| **M** | Endpoint que se mantiene idéntico al legacy. |
| **R** | Endpoint con rediseño (impacto en front). |
| **Mozo** | Rol operativo; toma pedidos y avanza estados. |
| **Admin** | Rol con acceso total, caja, reportes y cobros. |
| **Caja** | Turno de caja (apertura → cierre) con sus cobros. |
| **Movimiento** | Cobro (`Pago`) dentro del período de una caja. |
| **DTO** | Objeto de transferencia validado con `class-validator`. |

---

_Fin del documento._
