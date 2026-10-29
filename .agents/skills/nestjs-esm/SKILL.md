---
name: nestjs-esm
description: Convenciones no obvias del backend NestJS ESM de cafecito-mig-nest. Úsala al escribir o revisar código de src/ o test/ para respetar imports .js, capas, DTOs con fromEntity, errores { detail } con 422, transformers de decimales y fechas UTC, transacciones TypeORM y el patrón de tests con Vitest. Activa ante cualquier .module.ts, .controller.ts, .service.ts, .entity.ts, .dto.ts o .spec.ts del repositorio.
metadata:
  version: "1.0.0"
  domain: backend
  triggers: NestJS, TypeORM, ESM, DTO, entity, service, controller, Vitest, PostgreSQL, cafecito
  source: docs/conventions.md
---

# NestJS + ESM — cafecito-mig-nest

Fuente de verdad: [`docs/conventions.md`](../../../docs/conventions.md) y
[`docs/constitution.md`](../../../docs/constitution.md). Si esta skill y la
constitución se contradicen, **gana la constitución**.

## 1. ESM: el error más caro

El proyecto es `"type": "module"` con `module: nodenext`. **Todo import relativo
lleva `.js`**, aunque el archivo fuente sea `.ts`.

```ts
// correcto
import { CategoriasService } from './categorias.service.js';
import type { Categoria } from './entities/categoria.entity.js';

// incorrecto: compila en el editor y rompe en runtime
import { CategoriasService } from './categorias.service';
```

Orden de imports: Node → NestJS/terceros → internos (`common`, `config`,
`database`) → relativos del feature. Sin barrels dentro del feature module.

## 2. Capas

| Capa       | Hace                                       | No hace                          |
| ---------- | ------------------------------------------ | -------------------------------- |
| Controller | Traduce HTTP ↔ service                     | Reglas de negocio, acceso a datos |
| Service    | Negocio + datos + transacciones            | Conocer `Request`/`Response`     |
| Entity     | Mapeo 1:1 de tabla                         | Lógica, campos calculados        |
| DTO        | Contrato de entrada/salida                 | Acceso a datos                   |

Si un controller tiene un `if` de negocio, el PR se rechaza.

## 3. Contrato HTTP

- JSON en `snake_case` (`pedido_id`, `metodo_pago`), paths `kebab-case` bajo
  `/api/v1` (prefijo global: el controller declara solo el recurso).
- Códigos: `201` crear, `204` borrar sin body, `200` el resto. **`POST /pago`
  responde `200`, no `201`.**
- Errores siempre `{ "detail": "mensaje en español" }`.
- Validación siempre `422`; errores de negocio `400`; inexistente `404`; sin
  permisos `403`; token inválido `401`.
- Decimales como `number` (no string); fechas ISO-8601 UTC con `Z`.
- `null` explícito, nunca campo omitido. `GET /caja/` sin caja abierta devuelve
  `null` literal en el body.

## 4. DTOs

Nunca se serializa una entity.

```ts
export class CategoriaResponseDto {
  @ApiProperty({ example: 1 }) id!: number;
  @ApiProperty({ example: 'Bebidas' }) nombre!: string;

  static fromEntity(categoria: Categoria): CategoriaResponseDto {
    const dto = new CategoriaResponseDto();
    dto.id = categoria.id;
    dto.nombre = categoria.nombre;
    return dto;
  }
}
```

- Request: `class-validator`, mensajes en español, un mensaje
  `Campo '<campo>': <mensaje>`.
- El DTO de request no declara campos que el servidor calcula (`monto`, `total`,
  `usuario_id`, `caja_id`).

## 5. Entities y persistencia

- `@Entity('<tabla>')` explícito, `snake_case`, igual al legacy.
- Restricciones con el nombre real de PostgreSQL (`@Unique('pagos_pedido_id_key', ...)`).
- `numeric(10,2)` → `numericTransformer` de `src/common`; nunca conversiones
  ad hoc por módulo. El DTO refuerza con `Number()`.
- `timestamp without time zone` del legacy → `utcTimestampTransformer`; el DTO
  serializa con `toIsoUtc()`. El proceso corre en UTC.
- Relaciones solo cuando existen **ambas** entities. Sin `eager: true`. Nunca se
  crea una entity parcial para satisfacer una relación sobre la base compartida.
- `synchronize` solo en desarrollo local; contra Neon siempre `false`.

## 6. Transacciones (cobro, creación de pedido)

- La transacción vive en el **service dueño de la regla**, no en el controller.
- `dataSource.transaction(async (manager) => { ... })` o `QueryRunner`.
- Lectura con bloqueo cuando hay carrera: `setLock('pessimistic_write')` sobre el
  pedido y sobre la caja abierta.
- Validar todo antes de escribir; si un paso falla, la transacción no deja pago,
  ni cambio de estado, ni mesa liberada.
- Regla de caja: lo que se puede derivar no se persiste (ej. `total_ventas`).

## 7. Tests (Vitest)

- Unitarios al lado del service: `<recurso>.service.spec.ts`, sin base.
- Mocks compartidos de `test/utils/` (`createMockRepository`,
  `provideMockRepository`, `createServiceTestModule`); no copiar factories.
- Se verifica la llamada al repositorio, no solo el resultado.
- Casos mínimos: con datos, vacío y errores de negocio. Escritura: al menos un
  error por operación.
- Nombres en español, en presente: `rechaza el cobro si no hay caja abierta`.
- e2e en `test/*.e2e-spec.ts`: path con y sin barra final, status y shape.
- Para locks: `expect(repository.queryBuilder.setLock).toHaveBeenCalledWith('pessimistic_write')`.

## 8. Prohibiciones

- `any` sin justificar, `console.log`, `TODO` sin ticket `TODO(MIG-XX)`.
- `@ts-ignore` sin ticket; desactivar ESLint sin comentario.
- Lógica de negocio en el controller.
- `forwardRef` para ciclos: se mueve la regla al módulo dueño.
- Cambiar el contrato para que compile.
- Instalar dependencias sin justificar en el PR.

## 9. Verificación antes de decir "listo"

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
```

Los cuatro en verde. Si algo no se pudo verificar (base, credenciales), se dice
explícitamente; no se asume.
