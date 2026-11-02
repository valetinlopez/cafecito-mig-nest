# Plan — 034-dashboard

## Enfoque

Completar el módulo de solo lectura ya registrado. El servicio ejecutará agregaciones para pagos, mesas y pedidos activos, consultará cajas abiertas tolerando múltiples filas y recuperará hasta 50 pedidos recientes con sus relaciones. Las consultas independientes podrán ejecutarse en paralelo. Un DTO explícito construirá el shape contractual; el controller exigirá autenticación y rol admin.

## Archivos

- `src/dashboard/dashboard.module.ts` — repositorios/providers del módulo.
- `src/dashboard/dashboard.controller.ts` — endpoint GET protegido.
- `src/dashboard/dashboard.service.ts` y `.spec.ts` — agregaciones, proyecciones y pruebas unitarias.
- `src/dashboard/dto/dashboard-resumen-response.dto.ts` — respuesta y mapeo explícito.
- `test/dashboard.e2e-spec.ts` — autorización, status y shape HTTP.
- `src/dashboard/README.md`, `CONTRACT.md`, `DECISIONS.md` — reflejar alcance y límite de 50.
- `docs/architecture.md`, `.agents/memory.md`, `specs/README.md` — estado del módulo y ticket.
- `specs/034-dashboard/{spec,clarify,plan,tasks,validate}.md` — artefactos SDD.

No se modificarán `docs/api-contract.md` ni `docs/openapi.yaml`: la respuesta sigue su contrato actual.

## Orden de implementación

1. DTO de respuesta y pruebas de mapeo: ceros, decimales y fechas/null.
2. Consultas SQL agregadas para pagos del día, mesas y pedidos activos; pruebas de cada estado y límites temporales.
3. Consulta de caja y últimos 50 pedidos; probar caja ausente/múltiple, orden, límite y relaciones.
4. Controller, guard/rol admin y E2E para 200, 401, 403, shape y barra final.
5. Actualizar documentación/memoria; ejecutar gates completos y completar `validate.md`.

## Riesgos y mitigaciones

- Los conteos de TypeORM pueden regresar como string según el driver: normalizar en la proyección y verificar tipos JSON con tests.
- La zona horaria de negocio difiere de UTC: calcular límites de `America/Argentina/Buenos_Aires` y convertirlos a instantes UTC antes del filtro.
- Los nombres de respuesta deben permanecer `mesa` e `items`; los tests fijarán el contrato.
- Varias cajas abiertas contradicen la invariante normal del módulo de caja: ordenar por fecha de apertura descendente y escoger la más reciente.
- Las entities y relaciones son provisionales hasta MIG-44; no modificar el esquema ni inferir DDL desde el dashboard.

## Estrategia de pruebas

- Unitarias con repositorios mockeados, verificando argumentos de consultas, resultados vacíos y conversiones de salida.
- E2E con los helpers existentes y repositorios aislados; cubrir token ausente y `mozo`, éxito admin, response shape y rutas con/sin barra.
- Verificación final con lint, typecheck, unitarios y e2e completos, además de build según DoD.