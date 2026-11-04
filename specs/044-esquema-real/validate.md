# Validate — 044-esquema-real

> `REAL` = ejecutado el 2026-11-03 contra la branch de Neon `mig-44-validacion`, copia
> de `production` con datos y esquema. Registro en `docs/workflows/smoke-manual.md`.

## Matriz de requisitos

| Requisito | Test / evidencia                                                                                                     | Resultado |
| --------- | -------------------------------------------------------------------------------------------------------------------- | --------- |
| RF-01     | `pagos.service.spec.ts` › `consulta movimientos…`, `define el período…`. `REAL`: movimientos de las cajas 1 y 2      | Pasa      |
| RF-02     | `pagos.service.spec.ts` › `define el período…`. `REAL`: caja abierta con `total_ventas` 10200 y 2560                 | Pasa      |
| RF-03     | `pagos.service.spec.ts` › `calcula total…`, `obtiene total…`. `REAL`: API y SQL directo coinciden en las 8 cajas      | Pasa      |
| RF-04     | `reportes.service.spec.ts` › `excluye las cajas…`. `REAL`: caja 3 efectivo 2001, diferencia 0; caja 1 diferencia 0    | Pasa      |
| RF-05     | `pagos.service.spec.ts` › `consulta movimientos…`. `REAL`: el nombre coincide con el admin y con el mozo que tomaron el pedido | Pasa |
| RF-06     | `pagos.service.spec.ts` › `registra el pago…`; `pedidos.service.spec.ts` › `cobra total cero…`. `REAL`: cobro `200`   | Pasa      |
| RF-07     | `pedidos.service.spec.ts` › `no registra pago si el pedido no está entregado`. `REAL`: dos cobros simultáneos, `200` y `400`, un solo pago | Pasa |
| RF-08     | `caja.service.spec.ts` › `abre caja…`; `frontend-compat`. `REAL`: sin `NULL` en `cajas`                              | Pasa      |
| RF-09     | `pedidos.service.spec.ts` › `crea pedido…`; `frontend-compat`. `REAL`: sin `NULL` en `pedidos`                       | Pasa      |
| RF-10     | `pagos.service.spec.ts` › `registra el pago…`; `frontend-compat`. `REAL`: sin `NULL` en `pagos`                      | Pasa      |
| RF-11     | `users.service.spec.ts` › `normaliza el email…`; `frontend-compat`. `REAL`: empleado nuevo con `activo: true` y login `200` | Pasa |
| RF-12     | `REAL`: `npm run schema:log` → `Your schema is up to date`, antes y después del flujo. CI: `test/esquema-real.spec.ts` | Pasa     |
| RF-13     | `REAL`: `DB_SYNCHRONIZE` sin definir; columnas de `pagos` sin cambios después del flujo; sin migraciones              | Pasa      |
| RF-14     | `REAL`: el desarrollador inició sesión con un admin y un mozo reales; tokens con `sub`, `rol` y `exp`                 | Pasa      |
| RF-15     | `REAL`: login `401` con un empleado **de prueba** desactivado. El inactivo real no se probó                           | Pasa, con esa diferencia |
| RF-16     | `REAL`: pasos 1 a 7 de la guía, más el mozo real creando un pedido                                                    | Pasa      |
| RF-17     | `REAL`: caja 1 $1.300 y caja 2 $10.200, iguales a la consulta con la regla del legacy                                 | Pasa      |
| RF-18     | `docs/workflows/smoke-manual.md`, sin seed ni ids fijos                                                               | Pasa      |
| RNF-01    | `npm run test:e2e`, sin cambios de contrato: `docs/api-contract.md` y `docs/openapi.yaml` sin tocar                    | Pasa      |
| RNF-02    | Consultas con join y `SUM` en la base; `pagos.service.spec.ts`                                                        | Pasa      |
| RNF-03    | `package.json` sin cambios; `PagosModule` no importa `CajaModule`; la app arranca                                     | Pasa      |
| RNF-04    | `test/utils/frontend-compat.fixtures.ts` sin defaults de esas columnas; ver mutaciones                                | Pasa      |
| RNF-05    | `.env` ignorado por git; contraseñas ingresadas por el desarrollador; tokens temporales ya borrados                   | Pasa      |

## Verificaciones sobre la base real

| Guía | Verificación                                     | Resultado                                       |
| ---- | ------------------------------------------------ | ----------------------------------------------- |
| A    | Empleado nuevo sin `activo`, e iniciar sesión    | `activo: true`, login `200`                     |
| B    | Empleado desactivado                             | Login `401`                                     |
| C    | `DELETE` de un producto vendido (FK real)        | `400` con el mensaje del contrato; sigue existiendo |
| D    | `DELETE` de un producto sin ventas               | `204`; `GET` posterior `404`                    |
| E    | Pedido con stock insuficiente en un producto     | `400`; el stock y la mesa no cambian            |
| F    | Dos cobros simultáneos                           | `200` y `400`; un solo pago                     |
| G    | `schema:log` después del flujo                   | Sin cambios                                     |
| —    | Cobrar el pedido real que creó el backend Python | `200`; pedido `pagado`, mesa `libre`            |
| —    | Cobro y cierre simultáneos, 3 rondas             | Ganó el cierre en las 3: cobro `400`, sin pago  |
| —    | Mozo real intenta cobrar o ver la caja           | `403`                                           |

Después del flujo: ningún `NULL` en las columnas que asigna la aplicación, ningún
pedido con más de un pago y ningún pago fuera de una caja.

## Verificación de que los tests detectan fallas

Se quitó cada línea del código, se corrieron los tests y se restauró el archivo.

| Mutación                                  | Unitarios | `frontend-compat`       |
| ----------------------------------------- | --------- | ----------------------- |
| Sin `activo: true` al crear un usuario    | 1 falla   | 1 falla                 |
| Sin `fechaApertura` al abrir la caja      | 1 falla   | 3 fallan                |
| Sin `fecha` al crear un pedido            | 1 falla   | 5 fallan                |
| Sin `fecha` al registrar un pago          | 1 falla   | 2 fallan                |
| Período sin límite final                  | 1 falla   | No lo detecta: no ejecuta SQL |

## Lo que NO quedó verificado

- **Frontend visual** (sección 5 de la guía): horas en pantalla y recorrido por rol.
- **Login de un usuario inactivo real:** se usó un empleado de prueba desactivado.
- **Cobro que gana la carrera contra el cierre:** en las 3 rondas ganó el cierre, así
  que no se vio un pago justo antes de un cierre simultáneo.
- **Dos altas simultáneas con el mismo email** contra el índice único real. El `23505`
  solo está probado con un error simulado.
- **Backends conviviendo:** el legacy no escribió durante la prueba. Sí se leyeron y
  cobraron datos que él creó.
- **Comandos de la guía:** el backend se arrancó con `PORT=8000 node dist/main`, no con
  `start:dev`. El login se hizo con un script equivalente; el fragmento de la guía se
  probó solo con credenciales inválidas (`401`).
- `test/database.e2e-spec.ts` sigue omitido (2 tests): requiere `E2E_DATABASE=true`.

## Pendientes fuera de alcance

- Los DTOs de productos no validan el largo de `nombre` (100) ni `descripcion` (255).
  Un texto más largo probablemente responde `500`. No se probó.
- `numericTransformer` en `productos.precio` y `@OneToMany` en `categorias`: no cambian
  el esquema ni la API.

## Gates

| Gate      | Comando              | Resultado                                                |
| --------- | -------------------- | -------------------------------------------------------- |
| lint      | `npm run lint`       | OK                                                       |
| typecheck | `npm run typecheck`  | OK                                                       |
| unitarios | `npm test`           | 510 tests, 61 archivos                                   |
| e2e       | `npm run test:e2e`   | 129 tests, 12 archivos (2 omitidos: requieren base real) |
| build     | `npm run build`      | OK                                                       |
| esquema   | `npm run schema:log` | Sin cambios                                              |

Punto de partida antes de MIG-44: 483 unitarios y 129 e2e.

## VEREDICTO: APROBADO, con la branch de Neon pendiente de borrar

Fecha: 2026-11-03. Revisor: el mismo agente que implementó, sin revisor
independiente; **falta la revisión humana**.

CA-01, CA-02, CA-03, CA-05, CA-06 y CA-07 se cumplen; CA-02 con la diferencia indicada
en RF-15. **CA-04 sigue abierto** hasta que el desarrollador borre la branch.
