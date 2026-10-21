# Constitución del proyecto — Cafecitoapp Backend

| Campo     | Valor                                                     |
| --------- | --------------------------------------------------------- |
| Versión   | `1.0.0`                                                   |
| Alcance   | Todo el repositorio `cafecito-mig-nest`                   |
| Vigencia  | Desde MIG-17/MIG-18 hasta el cutover (MIG-42) y posterior |
| Enmiendas | Solo por ADR aprobado (ver §12)                           |

> Esta constitución fija los principios que **no se negocian en un PR**. Si el
> código y este documento se contradicen, el documento gana: el código se
> corrige o se abre un ADR para cambiar el principio.

---

## Artículo 1 — Contrato primero

El shape de request/response lo define [`api-contract.md`](./api-contract.md) y
[`openapi.yaml`](./openapi.yaml). El código se adapta al contrato, nunca al
revés.

**Verificación:** todo endpoint nuevo se compara campo por campo contra el
contrato antes de abrir el PR. Si el contrato está incompleto, se actualiza el
contrato en el mismo PR (con aprobación).

---

## Artículo 2 — Compatibilidad con el legacy

Durante la migración el frontend debe seguir funcionando. No se renombran
recursos, paths, campos JSON ni códigos de estado. Los cambios intencionales ya
están decididos en el contrato (D-01 a D-16) y son los únicos permitidos.

**Verificación:** JSON en `snake_case`, paths en `kebab-case`, `/api/v1`
conservado y `/` fuera del prefijo.

---

## Artículo 3 — Una capa, una responsabilidad

| Capa       | Responsabilidad                                         | Prohibido                            |
| ---------- | ------------------------------------------------------- | ------------------------------------ |
| Controller | Traducir HTTP ↔ service.                                | Reglas de negocio, acceso a datos    |
| Service    | Negocio + acceso a datos. Es el único que toca el repo. | Conocer `Request`/`Response`         |
| Entity     | Mapeo 1 a 1 de la tabla.                                | Lógica de negocio, campos calculados |
| DTO        | Contrato de entrada/salida.                             | Acceso a datos                       |

**Verificación:** si un controller tiene un `if` de negocio o un service importa
`express`, el PR se rechaza.

---

## Artículo 4 — La base es compartida

La base de Neon tiene datos reales de producción. Las entities mapean tablas
existentes y **ninguna entity se crea a medias**. `synchronize` solo puede estar
activo en desarrollo local. Los cambios de esquema van por migración.

**Verificación:** `@Entity('<tabla>')` explícito, restricciones con el nombre
real de PostgreSQL, y `npm run schema:log` sin diferencias inesperadas (MIG-44).

---

## Artículo 5 — Todo módulo entra con tests

No existe PR de módulo sin tests unitarios en verde. Los módulos con endpoints
agregan e2e de contrato.

- Unitarios: `<recurso>.service.spec.ts`, sin base de datos, repositorio mockeado.
- e2e: `test/*.e2e-spec.ts`, cubren path, código de estado y shape.
- Casos mínimos: lista con datos, lista vacía, y los errores de negocio propios
  del módulo.

**Verificación:** `npm test` y `npm run test:e2e` en verde; cobertura de los
caminos felices y de al menos un error por operación de escritura.

---

## Artículo 6 — Documentación viva

Cada módulo tiene `README.md`, `CONTRACT.md` y `DECISIONS.md` junto al código.
`docs/architecture.md` y `.agents/memory.md` reflejan el estado real. Un cambio
que altera comportamiento **actualiza la documentación en el mismo PR**.

**Verificación:** el PR incluye el diff de docs o justifica por qué no aplica.

---

## Artículo 7 — Sin atajos silenciosos

- Prohibido `any` explícito sin justificación en el PR.
- Prohibido `console.log`: se usa el `Logger` de NestJS.
- Prohibido `TODO` sin ticket (`TODO(MIG-XX)`).
- Prohibido desactivar una regla de ESLint sin comentario que explique el motivo.
- Prohibido `@ts-ignore`/`@ts-expect-error` sin ticket asociado.

**Verificación:** `npm run lint` y `npm run typecheck` limpios.

---

## Artículo 8 — Seguridad y exposición de datos por defecto

- Nunca se serializa una entity: siempre un DTO de response con `fromEntity()`.
- `password_hash` y cualquier columna interna no cruzan el borde HTTP.
- Los endpoints protegidos declaran su guard y su rol; lo que no está declarado
  se asume `admin`, nunca público.
- Los secretos vienen del entorno; no se commitean valores reales.

**Verificación:** ningún DTO expone columnas internas; los e2e cubren `401`/`403`
cuando el módulo ya tiene guards.

---

## Artículo 9 — ESM explícito

El proyecto es ESM (`"type": "module"`, `module: nodenext`). Todo import relativo
lleva extensión `.js`, aunque el archivo fuente sea `.ts`.

**Verificación:** `npm run build` y `npm run typecheck` pasan sin ajustes de
resolución.

---

## Artículo 10 — TypeScript estricto

`strict`, `noUnusedLocals` y `noUnusedParameters` están activos. Las firmas
declaran `Promise<T>` de forma explícita. Los tipos de dominio (estados, roles,
métodos de pago) se modelan como uniones o enums, no como `string` libre.

**Verificación:** `npm run typecheck` sin errores ni supresiones.

---

## Artículo 11 — Decisiones trazables

Toda decisión que cruce módulos vive en un ADR de [`docs/adr/`](./adr/). Toda
decisión local vive en el `DECISIONS.md` del módulo. El chat y los comentarios de
PR no son fuentes de verdad.

**Verificación:** el ADR existe, está indexado y el código lo cita cuando aplica.

---

## Artículo 12 — Enmiendas

1. Se abre un ADR con estado `Propuesto` que explica el principio a cambiar, el
   motivo y el impacto en los módulos.
2. Se actualiza este documento con la nueva versión y una fila en el historial.
3. Se aplica el cambio en el mismo sprint, no "después".

### Historial de versiones

| Versión | Fecha      | Cambio                                               |
| ------- | ---------- | ---------------------------------------------------- |
| `1.0.0` | 2026-10-20 | Versión inicial derivada de MIG-17, MIG-18 y MIG-19. |
