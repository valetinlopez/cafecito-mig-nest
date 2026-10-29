# Definition of Done (DoD)

Un cambio está terminado cuando **todo** lo siguiente es verificable, no cuando
"funciona en mi máquina".

---

## 1. Verificación automática (obligatoria)

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
```

| Comando     | Criterio                     |
| ----------- | ---------------------------- |
| `lint`      | 0 errores, 0 warnings nuevos |
| `typecheck` | 0 errores                    |
| `test`      | Todo en verde                |
| `test:e2e`  | Todo en verde                |

Si alguno falla, el cambio **no está terminado**. No se desactiva una regla para
pasar el lint.

---

## 2. Código

- [ ] Respeta las capas de la [constitución](../constitution.md) §3.
- [ ] Imports relativos con `.js`.
- [ ] Sin `any` sin justificar, sin `console.log`, sin `TODO` sin ticket.
- [ ] Nombres según [convenciones](../conventions.md) §4.
- [ ] La lógica de orden/filtros corre en la base.
- [ ] Los DTOs de response usan `fromEntity()`; ninguna entity se serializa.
- [ ] Los errores de negocio usan el código correcto (`400`/`404`/`403`).

---

## 3. Contrato

- [ ] Path, método y código de estado coinciden con
      [`api-contract.md`](../api-contract.md).
- [ ] Campos JSON en `snake_case`, sin agregados ni renombres.
- [ ] El endpoint responde igual con y sin barra final (colecciones).
- [ ] Decimales como `number`; fechas ISO-8601 UTC con `Z`.
- [ ] `null` es `null` explícito, nunca campo omitido.
- [ ] Swagger anotado: `@ApiTags`, `@ApiOperation` con `operationId` estable,
      `@ApiOkResponse`/errores y `@ApiProperty` con ejemplo realista.

---

## 4. Tests

- [ ] Unitarios del service: caso con datos, caso vacío y errores de negocio.
- [ ] Se verifica la llamada al repositorio, no solo el resultado.
- [ ] e2e del endpoint nuevo o modificado (path, status, shape).
- [ ] Si hay guard, e2e de `401`/`403`.

---

## 5. Documentación (harness)

- [ ] Si el cambio tiene comportamiento nuevo: `specs/NNN-slug/spec.md`,
      `clarify.md`, `plan.md`, `tasks.md` y `validate.md` con `VEREDICTO`
      ([SDD](./sdd.md), ADR 0008).
- [ ] `src/<modulo>/AGENTS.md` actualizado (índice, reglas locales, verificación).
- [ ] `src/<modulo>/README.md` actualizado (responsabilidad, capas, estado).
- [ ] `src/<modulo>/CONTRACT.md` actualizado si cambió un endpoint.
- [ ] `src/<modulo>/DECISIONS.md` con la decisión nueva y su motivo.
- [ ] `docs/architecture.md` actualizado si cambió un componente o dependencia.
- [ ] ADR nuevo en `docs/adr/` si la decisión cruza módulos.
- [ ] `docs/api-contract.md` y `docs/openapi.yaml` actualizados si cambió el
      contrato.
- [ ] `.agents/memory.md` refleja el nuevo estado.

---

## 6. PR

- [ ] Título y descripción con ticket `MIG-XX`.
- [ ] Descripción: qué cambia, cómo se verificó, riesgos.
- [ ] Evidencia: salida de tests o `curl` del endpoint.
- [ ] Diff acotado al ticket; sin refactors colaterales.
- [ ] Sin archivos generados (`dist/`, `coverage/`) ni secretos.

---

## 7. Checklist rápido

```
[ ] lint        [ ] typecheck     [ ] test        [ ] test:e2e
[ ] contrato    [ ] docs módulo   [ ] ADR         [ ] memory
```
