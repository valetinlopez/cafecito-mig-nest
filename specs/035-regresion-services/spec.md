# Spec 035 — Tests de regresión de servicios

| Campo   | Valor |
| ------- | ----- |
| Ticket  | MIG-35 |
| Epic    | MIG-7 — Calidad y pruebas de regresión |
| Estado  | Aprobada |
| Alcance | Regresiones de servicios; cobertura superior a 85 %. |

## 1. Contexto

Los servicios migrados necesitan regresiones automatizadas sobre transiciones, validaciones, locks, respuestas numéricas y configuración del pool antes de continuar con los siguientes módulos.

## 2. Fuera de alcance

- Migrar Vitest a Jest o mantener dos runners: Vitest sigue siendo el runner único conforme a ADR 0006.
- Crear endpoints/servicios aún no implementados, incluido DELETE de productos.
- Implementar Reportes; el módulo permanece scaffold y se difiere.
- Cambiar reglas de negocio aprobadas por specs anteriores, como permitir más de un pedido activo por mesa.
- Pruebas que requieran una base compartida real; `FOR UPDATE` se verifica con mocks y la prueba de Neon cubre la configuración del pool.

## 3. Historia de usuario

**Como** equipo backend, **quiero** ampliar la suite de regresión de los servicios migrados, **para** detectar incompatibilidades de negocio y concurrencia sin depender de una base real.

## 4. Requisitos funcionales

- **RF-01** CUANDO se valida una transición manual de mesa, EL SISTEMA DEBE aceptar solo las transiciones declaradas y rechazar las demás con el error contractual.
- **RF-02** CUANDO se cambia una mesa a limpieza, EL SISTEMA DEBE bloquearla si existe un pedido activo sin cobrar y permitirla cuando no existe.
- **RF-03** CUANDO se envía un producto con precio no positivo, stock negativo o stock mínimo negativo, EL SISTEMA DEBE responder `422` con el envelope contractual; EL SISTEMA DEBE conservar el default de stock mínimo `5`.
- **RF-04** CUANDO se crea un pedido con mesa inexistente, producto inexistente, producto no disponible, stock insuficiente o pedido activo previo, EL SISTEMA DEBE rechazarlo sin persistir parcialmente.
- **RF-05** CUANDO un pedido cobra o cambia de estado bajo concurrencia, EL SISTEMA DEBE solicitar los locks pesimistas requeridos para pedido, mesa y caja.
- **RF-06** CUANDO se abre o cierra una caja, EL SISTEMA DEBE mantener las reglas de caja única, persistir el cierre y consultar bajo lock la caja que se cierra.
- **RF-07** CUANDO se proyectan movimientos o ventas de caja, EL SISTEMA DEBE devolver los campos contractuales y ceros cuando no hay pagos.
- **RF-08** CUANDO el dashboard encuentra varias cajas abiertas, EL SISTEMA DEBE elegir la de fecha de apertura más reciente y no fallar por cardinalidad.
- **RF-09** CUANDO un response contiene un decimal, EL SISTEMA DEBE serializar el valor como número JSON, no como string.
- **RF-10** CUANDO se crean las opciones de conexión PostgreSQL, EL SISTEMA DEBE configurar el pool para descartar conexiones inactivas antes del timeout de Neon y manejar errores del pool sin tumbar el proceso.
- **RF-11** CUANDO se mide la cobertura de la suite unitaria, EL SISTEMA DEBE mantener la cobertura global de services por encima de 85 %.

## 5. Requisitos no funcionales

- **RNF-01** Vitest continúa siendo el único runner, sin nuevas dependencias de Jest.
- **RNF-02** Los tests unitarios usan repositorios y QueryBuilder mockeados; las consultas con lock verifican `setLock('pessimistic_write')` o la opción de lock equivalente del repositorio.
- **RNF-03** Los tests no alteran contratos ni reglas documentadas en specs aceptadas.

## 6. Casos límite y errores

- Transiciones inválidas de mesa incluyen `libre → pendiente_cobro`, `pendiente_cobro → libre` y `ocupada → pendiente_cobro` manuales.
- La existencia de un pedido activo impide cambiar la mesa a limpieza.
- Cantidades y precios inválidos se rechazan con `422`.
- `CFB-128`: la consulta de pedido activo debe manejar cardinalidad sin traducirla a error `500`; aun así, la regla vigente impide crear un segundo pedido activo para la mesa.
- Sin ventas, caja debe reportar total `0`.
- La selección del dashboard desempata por id descendente cuando las fechas son iguales.

## 7. Criterios de aceptación

- **CA-01** RF-01 y RF-02 tienen casos unitarios para éxito, rechazo y argumentos consultados.
- **CA-02** RF-03 cubre tanto creación como actualización y conserva el default de stock mínimo.
- **CA-03** RF-04 y RF-05 cubren errores de negocio y locks; ningún camino rechazado deja escrituras posteriores.
- **CA-04** RF-06 y RF-07 cubren apertura, cierre, historial, movimientos y ventas sin pagos.
- **CA-05** RF-08, RF-09 y RF-10 verifican orden determinista, tipo JSON y configuración/handler del pool.
- **CA-06** `npm run test:cov` informa cobertura global de services >85 % y todos los umbrales configurados pasan.
- **CA-07** Lint, typecheck, unitarios y e2e completos pasan.

## 8. Supuestos y preguntas abiertas

- Se conserva Vitest conforme a ADR 0006; el usuario aprobó explícitamente este ajuste frente al pedido inicial de Jest.
- Reportes queda diferido porque no existe una implementación que pueda validarse con tests unitarios.
- DELETE de productos queda diferido al ticket que implemente esa operación.
- La política de un pedido activo por mesa de MIG-33 prevalece sobre una lectura de CFB-128 que permitiera pedidos activos múltiples.

## 9. Referencias

- ADR 0006 — Vitest como runner único.
- `docs/workflows/sdd.md` — ciclo de pruebas y validación.
- `specs/033-pedidos/spec.md` — invariante de pedido activo por mesa.
- CFB-121, CFB-128 y CFB-157 — casos relacionados.
