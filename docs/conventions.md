# Convenciones de código — Backend NestJS

| Campo                    | Valor                                                                               |
| ------------------------ | ----------------------------------------------------------------------------------- |
| **Ticket**               | MIG-18 — Convenciones de código + módulo de referencia Categorías                   |
| **Epic**                 | MIG-1 — Bootcamp NestJS & Scaffolding del Proyecto                                  |
| **Sprint**               | S0 — Bootcamp                                                                       |
| **Módulo de referencia** | `src/categorias`                                                                    |
| **Contrato de API**      | [`docs/api-contract.md`](./api-contract.md) · [`docs/openapi.yaml`](./openapi.yaml) |
| **Alcance**              | Team de 3 devs. Este documento es la plantilla para el resto de los módulos.        |

> **Cómo usar este documento.** Copiá la estructura de `src/categorias` para cada módulo nuevo y respetá las reglas de las secciones 3 a 10. Si algo no está cubierto acá, se resuelve en el PR y se agrega a este archivo: no se inventa una convención por módulo.

---

## 1. Principios

1. **Contrato primero.** El shape de request/response lo define `docs/api-contract.md`; el código se adapta al contrato, nunca al revés.
2. **Compatibilidad con el legacy.** El frontend sigue funcionando durante la migración: no se renombran campos, paths ni códigos de estado.
3. **Una capa, una responsabilidad.** Controller = HTTP. Service = negocio y acceso a datos. Entity = mapeo de tabla. DTO = contrato.
4. **La base es compartida con producción.** Las entities mapean 1 a 1 las tablas existentes. Ninguna entity se crea "a medias".
5. **Todo módulo entra con tests.** No hay PR de módulo sin `*.spec.ts` en verde.

---

## 2. Checklist antes de abrir un PR

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
```

- [ ] `lint`, `typecheck` y ambos suites de tests en verde.
- [ ] `GET` del módulo verificado con y sin barra final (D-04).
- [ ] Respuestas comparadas contra `docs/api-contract.md` (nombres, tipos, códigos).
- [ ] Sin `console.log`, sin `any` innecesario, sin `TODO` sin ticket asociado.
- [ ] Documento de Swagger anotado (`@ApiOperation`, `@ApiProperty`).
- [ ] PR con descripción, ticket (`MIG-XX`) y capturas/curl de la verificación.

---

## 3. Estructura de un feature module

```
src/<recurso>/
├── <recurso>.module.ts
├── <recurso>.controller.ts
├── <recurso>.service.ts
├── <recurso>.service.spec.ts
├── dto/
│   ├── create-<recurso>.dto.ts        # solo si el módulo escribe
│   ├── update-<recurso>.dto.ts        # solo si el módulo escribe
│   └── <recurso>-response.dto.ts      # siempre
└── entities/
    └── <recurso>.entity.ts
```

Ejemplo real (`src/categorias`, módulo de solo lectura):

```
src/categorias/
├── categorias.module.ts
├── categorias.controller.ts
├── categorias.service.ts
├── categorias.service.spec.ts
├── dto/
│   └── categoria-response.dto.ts
└── entities/
    └── categoria.entity.ts
```

Reglas:

- El nombre del directorio es el recurso en **plural** (`categorias`, `mesas`, `productos`).
- Un módulo por recurso. Las piezas transversales van en `src/common/`.
- **Sin barrels (`index.ts`) dentro del feature module.** Los imports van al archivo concreto: un barrel que reexporta entities genera ciclos (`Categoria → Producto → Categoria`) y TypeORM los resuelve mal. Los barrels, si se usan, se limitan a `src/common/`.
- Los tests unitarios viven al lado del service (`<recurso>.service.spec.ts`). Los e2e van en `test/`.

---

## 4. Naming

| Elemento               | Convención                                     | Ejemplo                                                             |
| ---------------------- | ---------------------------------------------- | ------------------------------------------------------------------- |
| Archivos y directorios | `kebab-case`                                   | `categorias.service.ts`, `categoria-response.dto.ts`                |
| Clases                 | `PascalCase` + sufijo del rol                  | `CategoriasController`, `CategoriasService`, `CategoriaResponseDto` |
| Entidades              | `PascalCase` singular                          | `Categoria`, `DetallePedido`                                        |
| Métodos y variables    | `camelCase`                                    | `getAllCategorias()`, `categoriasRepository`                        |
| Métodos del service    | Verbo en español heredado del legacy + recurso | `getAllCategorias()`, `createMesa()`, `cobrarPedido()`              |
| Tabla (PostgreSQL)     | `snake_case` plural, igual al legacy           | `categorias`, `detalle_pedidos`                                     |
| Columna (PostgreSQL)   | `snake_case`, igual al legacy                  | `password_hash`, `stock_minimo`                                     |
| Campos JSON            | `snake_case`, igual al legacy                  | `access_token`, `categoria_id`, `fecha_apertura`                    |
| Paths HTTP             | `kebab-case`, plural, bajo `/api/v1`           | `/api/v1/categorias/`, `/api/v1/auth/change-password`               |
| Tokens de inyección    | `SCREAMING_SNAKE_CASE`                         | `CATEGORIAS_REPOSITORY`                                             |
| Constantes             | `SCREAMING_SNAKE_CASE`                         | `SERVICE_NAME`, `MAX_CATEGORIAS`                                    |

> **No se traduce a camelCase en el JSON.** El frontend consume `snake_case`; cambiarlo rompe tipos y stores (ver D-13 del contrato).

---

## 5. Imports y ESM

El proyecto es ESM (`"type": "module"`, `module: nodenext`).

- **Todo import relativo lleva extensión `.js`**, aunque el archivo sea `.ts`:

```ts
import { CategoriasService } from './categorias.service.js';
import { Categoria } from './entities/categoria.entity.js';
```

- Orden de imports (Prettier no los ordena; se respeta a mano):

```ts
// 1. Node
import { Server } from 'node:http';

// 2. NestJS y terceros
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

// 3. Módulos internos (common, config, database)
import { numericTransformer } from '../../common/transformers/numeric.transformer.js';

// 4. Relativos del feature
import { CategoriaResponseDto } from './dto/categoria-response.dto.js';
import { Categoria } from './entities/categoria.entity.js';
```

- Importá tipos con `import type` cuando no se emite valor:
  `import type { Repository } from 'typeorm';` / `import type { Categoria } from '../entities/categoria.entity.js';`
- Prohibido `any` explícito salvo justificación en el PR. La regla de ESLint está en `warn` para `no-floating-promises` y en `error` para el resto; el CI debe quedar limpio.

---

## 6. Capas y responsabilidades

### 6.1 Entity — `entities/<recurso>.entity.ts`

- Mapea **exactamente** una tabla existente:

```ts
@Entity('categorias')
@Unique('categorias_nombre_key', ['nombre'])
export class Categoria {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 50 })
  nombre!: string;
}
```

- `@Entity('<tabla>')` **siempre** explícito: nunca delegar en el nombre de la clase.
- Las restricciones (`@Unique`, `@Index`) llevan **nombre explícito igual al de PostgreSQL** (`categorias_nombre_key`). Sin eso, TypeORM genera `UQ_<hash>` y `schema:log` (MIG-44) propone recrear la restricción.
- Tipos alineados con PostgreSQL: `varchar(n)`, `numeric(10,2)`, `timestamptz`, `boolean`, `int`.
- Decimales (`numeric`) se leen como `string` desde `pg`; usar el transformer compartido y convertir a `number` en el DTO de salida (D-05).
- Fechas: `timestamptz` + serialización ISO-8601 con `Z` (D-06).
- **Relaciones:** se declaran cuando existen ambas entities. Nunca se crea una entity parcial solo para satisfacer una relación: con `synchronize` en desarrollo, TypeORM podría alterar la tabla compartida. `Categoria` agrega su `@OneToMany` en MIG-29.
- No usar `eager: true` (dispara queries implícitas); las relaciones se piden explícitamente con `relations` o `QueryBuilder`.

### 6.2 DTO — `dto/`

- **Request:** una clase por operación (`CreateMesaDto`, `UpdateMesaDto`) con `class-validator`. Los mensajes van en español y el `ValidationPipe` global responde **422** con `{ "detail": "Campo 'x': mensaje" }` (D-03, MIG-20).
- **Response:** una clase por recurso (`CategoriaResponseDto`), con `@ApiProperty` y un factory estático `fromEntity()`. **Nunca se serializa una entity directamente**: filtra columnas internas (`password_hash`) y congela el contrato.
- Los nombres de propiedades respetan `snake_case` del contrato (`categoria_id`, no `categoriaId`).

```ts
export class CategoriaResponseDto {
  @ApiProperty({ example: 1 }) id!: number;
  @ApiProperty({ example: 'Bebidas', maxLength: 50 }) nombre!: string;

  static fromEntity(categoria: Categoria): CategoriaResponseDto {
    const dto = new CategoriaResponseDto();
    dto.id = categoria.id;
    dto.nombre = categoria.nombre;
    return dto;
  }
}
```

### 6.3 Service — `<recurso>.service.ts`

- Único punto de acceso a datos. Inyecta el repositorio con `@InjectRepository(Entity)`.
- Devuelve **DTOs**, no entities.
- El orden, los filtros y los límites se resuelven en la base (`find({ order })`, `QueryBuilder`), no con `.sort()` en memoria.
- Lógica de negocio (transiciones de estado, stock, caja) vive acá. El controller no la conoce.
- Métodos `async` y `Promise<T>` explícito en la firma.

```ts
@Injectable()
export class CategoriasService {
  constructor(
    @InjectRepository(Categoria)
    private readonly categoriasRepository: Repository<Categoria>,
  ) {}

  async getAllCategorias(): Promise<CategoriaResponseDto[]> {
    const categorias = await this.categoriasRepository.find({
      order: { nombre: 'ASC' },
    });
    return categorias.map((c) => CategoriaResponseDto.fromEntity(c));
  }
}
```

### 6.4 Controller — `<recurso>.controller.ts`

- Solo traduce HTTP ↔ service: recibe parámetros, delega y devuelve.
- El prefijo `/api/v1` es global (`main.ts`, D-01); el controller declara solo el recurso: `@Controller('categorias')`.
- Códigos: `200` lectura/actualización, `201` creación, `204` borrado sin body (D-07).
- Anotado con `@ApiTags` + `@ApiOperation` (ver §9).

```ts
@ApiTags('Categorías')
@ApiBearerAuth()
@Controller('categorias')
export class CategoriasController {
  constructor(private readonly categoriasService: CategoriasService) {}

  @Get()
  @ApiOperation({ operationId: 'listCategorias', summary: 'Listar categorías' })
  @ApiOkResponse({ type: [CategoriaResponseDto] })
  async findAll(): Promise<CategoriaResponseDto[]> {
    return this.categoriasService.getAllCategorias();
  }
}
```

### 6.5 Module — `<recurso>.module.ts`

```ts
@Module({
  imports: [TypeOrmModule.forFeature([Categoria])],
  controllers: [CategoriasController],
  providers: [CategoriasService],
  exports: [CategoriasService],
})
export class CategoriasModule {}
```

- `exports` solo cuando otro módulo consume el service (ej. `ProductosModule` usará `CategoriasService`).
- El módulo se registra en `src/app.module.ts` una vez que exista `TypeOrmModule.forRoot()` (ver §11).

---

## 7. Contrato HTTP transversal

| Tema              | Regla                                                                                                |
| ----------------- | ---------------------------------------------------------------------------------------------------- |
| Prefijo           | `/api/v1` global; el health queda fuera (`GET /`)                                                    |
| Barra final       | Las colecciones aceptan con y sin barra, sin redirect (Express default; no activar `strict routing`) |
| Errores           | `{ "detail": "mensaje en español" }` en **todo** código no-2xx                                       |
| Validación        | `422`, un solo mensaje `Campo '<campo>': <mensaje>`                                                  |
| Éxito sin recurso | `{ "message": "..." }`                                                                               |
| Decimales         | `number` JSON con 2 decimales                                                                        |
| Fechas            | ISO-8601 UTC con `Z` (`2026-10-19T20:24:10.000Z`)                                                    |
| Nulos             | `null` explícito, nunca campo omitido                                                                |
| Paginación        | No (D-10): las listas son arrays completos                                                           |
| Auth              | `Authorization: Bearer <JWT>`; roles `admin` y `mozo`                                                |

Errores de negocio → `400`. Recurso inexistente → `404`. Sin permisos → `403`. Token inválido → `401`.

---

## 8. Tests

### 8.1 Unitarios (Vitest + `@nestjs/testing`)

- Un archivo por service: `<recurso>.service.spec.ts`.
- **Sin base de datos**: se mockea el repositorio con `getRepositoryToken(Entity)`.
- Casos mínimos: lista con datos (verificando orden y mapeo a DTO) y lista vacía. Los módulos con escritura agregan error de negocio y transición inválida.
- Se verifica la llamada al repositorio (`toHaveBeenCalledWith`), no solo el resultado.

```ts
const module = await Test.createTestingModule({
  providers: [
    CategoriasService,
    { provide: getRepositoryToken(Categoria), useValue: { find } },
  ],
}).compile();
```

- Nombres de tests en español, en presente: `devuelve las categorías ordenadas por nombre`.

### 8.2 e2e (`test/*.e2e-spec.ts`)

- Se ejecutan con `npm run test:e2e` (config `vitest.config.e2e.ts`).
- Cubren contrato HTTP: path con/sin barra final, código de estado y shape.
- Si el módulo depende de la DB y MIG-19 aún no está, se testea el controller con el service mockeado (patrón de `test/categorias.e2e-spec.ts`).

---

## 9. Documentación OpenAPI

Cada endpoint se anota en el código (fuente: `docs/openapi.yaml`):

| Decorador                                                | Uso                                                                                     |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `@ApiTags('Categorías')`                                 | Igual al tag del contrato, en español y con tilde                                       |
| `@ApiOperation({ operationId, summary, description })`   | `operationId` en `camelCase` (`listCategorias`) y estable: se usa para generar clientes |
| `@ApiOkResponse({ type: [Dto] })`                        | Shape de éxito                                                                          |
| `@ApiUnauthorizedResponse()` / `@ApiForbiddenResponse()` | Errores documentados                                                                    |
| `@ApiProperty({ example, description })`                 | Cada campo del DTO, con ejemplo realista                                                |
| `@ApiBearerAuth()`                                       | Endpoints protegidos                                                                    |

`SwaggerModule` se monta en MIG-40; las anotaciones ya quedan en el código para que ese ticket solo conecte el módulo.

### 9.1 Descubribilidad (SEO técnico de la API)

La documentación de la API es su superficie de búsqueda: lo que no está descrito no se encuentra.

- **`operationId` estable y descriptivo** (`listCategorias`, `createMesa`): es la clave que usan los generadores de SDK y las herramientas de exploración. No cambiarlo entre versiones.
- **Tags iguales al contrato**, en español y con tilde (`Categorías`), para que Swagger UI agrupe por dominio.
- **`summary` corto + `description` con el caso de uso** (qué devuelve, orden, filtros, restricciones de auth). Sin repetir el summary.
- **Ejemplos realistas** en cada `@ApiProperty` (`Bebidas`, `1`), no placeholders (`string`, `0`).
- **Documentar efectos y errores**: qué códigos puede devolver y en qué caso (`401`, `403`, `404`, `422`).
- **Deprecar, no borrar**: un campo o endpoint que se retira se marca `deprecated: true` y se documenta el reemplazo.

---

## 10. Cómo copiar este módulo

Para crear `Mesas`, `Productos`, etc.:

1. Copiar `src/categorias` a `src/<recurso>` y renombrar archivos y símbolos.
2. Ajustar `@Entity('<tabla>')` y las columnas al esquema real (ver MIG-44).
3. Definir los DTOs de request según el contrato y los de response con `fromEntity()`.
4. Implementar el service con `@InjectRepository`, resolviendo orden y filtros en la base.
5. Anotar el controller con los decoradores de Swagger del contrato.
6. Registrar el módulo en `src/app.module.ts`.
7. Copiar `categorias.service.spec.ts` y adaptar los casos; agregar e2e si cambia el path.
8. Correr el checklist de §2.

---

## 11. Cableado pendiente (dependencias entre tickets)

El módulo de referencia está completo, pero su ejecución end-to-end depende de tickets posteriores. Esta tabla evita que cada dev lo resuelva distinto:

| Dependencia                                           | Ticket | Efecto si falta                                                      |
| ----------------------------------------------------- | ------ | -------------------------------------------------------------------- |
| `TypeOrmModule.forRoot()` en `AppModule`              | MIG-19 | ✅ Resuelto: `DatabaseModule` registra el `DataSource` global        |
| `ValidationPipe` global con 422 y filtro `{ detail }` | MIG-20 | ✅ Resuelto: `CommonModule` + `app.setup.ts`                         |
| Utilidades de test / mocks compartidos                | MIG-21 | Cada módulo duplica mocks de repositorio                             |
| `JwtAuthGuard` + `RolesGuard`                         | MIG-24 | El endpoint queda sin protección (hoy no existe auth en el scaffold) |
| `SwaggerModule` en `main.ts`                          | MIG-40 | Las anotaciones no se publican en `/docs`                            |

**Activación de `CategoriasModule`:** queda registrado en `src/app.module.ts` desde MIG-19. El health check no consulta la base, así que su e2e corre sin PostgreSQL; los e2e que necesitan conexión real se corren con `E2E_DATABASE=true` (ver `README.md`).

---

_Última actualización: MIG-19 (Sprint S0)._
