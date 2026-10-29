# Workflow — Crear un módulo nuevo

Receta para pasar un módulo de _scaffold_ a _implementado_ sin improvisar.
Base: [`conventions.md`](../conventions.md) §3, §6 y §10.

---

## 0. Preparación

0. Si el módulo entrega comportamiento nuevo, empezá por la spec:
   `/sdd-spec NNN-slug` → `clarify` → `plan` → `tasks`
   ([ciclo SDD](./sdd.md), ADR 0008). El resto de esta receta es la fase 5.
1. Leé [`constitution.md`](../constitution.md) y
   [`architecture.md`](../architecture.md).
2. Leé el contrato del módulo en [`api-contract.md`](../api-contract.md) y
   verificá la spec en [`openapi.yaml`](../openapi.yaml).
3. Revisá `src/<modulo>/CONTRACT.md` y `DECISIONS.md`.
4. Confirmá los nombres reales de tabla y columnas contra la base (nunca
   inventarlos). Si no hay acceso, dejalo asentado en `DECISIONS.md`.

---

## 1. Entity(s)

```
src/<modulo>/entities/<recurso>.entity.ts
```

- `@Entity('<tabla>')` explícito, `snake_case`, igual al legacy.
- Columnas con tipo PostgreSQL real (`varchar(n)`, `numeric(10,2)`,
  `timestamp`, `timestamptz`, `boolean`, `int`).
- Restricciones con el nombre real (`@Unique('categorias_nombre_key', [...])`).
- Relaciones solo si ambas entities existen; sin `eager: true`.
- Decimales con `numericTransformer` (ADR 0004).
- Fechas del legacy (`timestamp without time zone`) con
  `utcTimestampTransformer` (ADR 0007).

---

## 2. DTOs

```
dto/create-<recurso>.dto.ts     # si escribe
dto/update-<recurso>.dto.ts     # si escribe
dto/<recurso>-response.dto.ts   # siempre
```

- Request: `class-validator` con mensajes en español.
- Response: `@ApiProperty` + `static fromEntity()`, shape exacto del contrato.
- Propiedades en `snake_case` cuando así lo exige el contrato
  (`categoria_id`, `access_token`).

---

## 3. Service

```ts
@Injectable()
export class <Recurso>Service {
  constructor(
    @InjectRepository(<Entity>)
    private readonly <recurso>Repository: Repository<<Entity>>,
  ) {}
}
```

- Único punto de acceso a datos.
- Devuelve DTOs, no entities.
- Orden, filtros y límites en la base.
- Reglas de negocio y transacciones acá, no en el controller.
- Métodos en español heredados del legacy (`getAll<Recurso>()`,
  `create<Recurso>()`, `cobrarPedido()`).

---

## 4. Controller

```ts
@ApiTags('<Tag del contrato>')
@ApiBearerAuth()
@Controller('<recurso>')
export class <Recurso>Controller {}
```

- Prefijo `/api/v1` es global: el controller declara solo el recurso.
- Códigos: `201` crear, `204` borrar sin body, `200` el resto.
- `operationId` estable y en `camelCase`.
- Sin lógica de negocio.

---

## 5. Module

```ts
@Module({
  imports: [TypeOrmModule.forFeature([<Entity>])],
  controllers: [<Recurso>Controller],
  providers: [<Recurso>Service],
  exports: [<Recurso>Service], // solo si otro módulo lo consume
})
export class <Recurso>Module {}
```

Ya está registrado en `src/app.module.ts`; verificá que no haya que agregarlo.

---

## 6. Tests

1. Copiá `src/categorias/categorias.service.spec.ts` y adaptá.
2. Mockeá el repositorio con `getRepositoryToken(<Entity>)`.
3. Casos: lista con datos (orden y mapeo), lista vacía, error de negocio,
   transición inválida si aplica.
4. Agregá `test/<recurso>.e2e-spec.ts` con path con/sin barra, status y shape.

---

## 7. Documentación del módulo

Completá los cuatro archivos de `src/<modulo>/`:

| Archivo        | Contenido                                                                                              |
| -------------- | ------------------------------------------------------------------------------------------------------ |
| `AGENTS.md`    | Shim ≤ 40 líneas: por dónde empezar, reglas no obvias y comando de verificación. No duplica contenido. |
| `README.md`    | Estado, responsabilidad, entity/tabla, endpoints, service methods, tests, dependencias, pendientes.    |
| `CONTRACT.md`  | Tabla de endpoints con auth/body/éxito/errores + ejemplos reales.                                      |
| `DECISIONS.md` | Decisiones locales, riesgos y wiring pendiente, con motivo.                                            |

Actualizá también `docs/architecture.md` (estado del módulo y dependencias) y
`.agents/memory.md`.

---

## 8. Cierre

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
```

Luego: PR con ticket, evidencia y diff de docs. Checklist completo en
[`definition-of-done.md`](./definition-of-done.md).
