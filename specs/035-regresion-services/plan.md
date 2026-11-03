# Plan — 035-regresion-services

## Enfoque

Ampliar specs de servicios existentes con Vitest y helpers compartidos. No se modificarán servicios ni contratos salvo que un nuevo test revele una contradicción con una regla ya aprobada; en ese caso se detiene la implementación y se abre SDD change.

## Archivos

- `src/mesas/mesas.service.spec.ts` — matriz de transiciones y limpieza sin pedido activo.
- `src/productos/productos.service.spec.ts`, `test/productos.e2e-spec.ts` — errores de categoría y validaciones HTTP create/update.
- `src/pedidos/pedidos.service.spec.ts` — producto faltante/no disponible, cardinalidad activa y locks.
- `src/caja/caja.service.spec.ts` — mapeo de movimientos, cero ventas y lock de cierre.
- `src/dashboard/dashboard.service.spec.ts` — selección por fecha y desempate.
- `src/database/typeorm-options.spec.ts` — idle timeout y handler de error.
- `src/pedidos/dto/pedido-response.dto.spec.ts`, `src/pagos/dto/pago-response.dto.spec.ts`, `test/productos.e2e-spec.ts` o test arquitectónico de respuesta — contrato decimal JSON.
- `specs/035-regresion-services/` y `specs/README.md` — artefactos SDD.

## Orden

1. Agregar primero los tests de transiciones/limpieza y parámetros de validación que fallan ante huecos.
2. Completar errores de producto en pedidos y verificar locks solicitados.
3. Completar proyecciones de caja y caja múltiple del dashboard.
4. Fijar pruebas de decimal JSON y pool PostgreSQL.
5. Medir cobertura y, si falta el piso de 85 % de services, cubrir ramas ejecutables existentes sin alterar reglas.
6. Ejecutar todos los gates y completar la matriz de validación.

## Riesgos

- Los conteos de tests actuales ya incluyen matrices `it.each`; el criterio es cobertura verificable, no alcanzar 75 casos nuevos.
- CFB-128 se limita a error de negocio estable y cardinalidad segura; no se cambiará el máximo de un pedido activo por mesa.
- CFB-121 y Reportes no tienen funcionalidad presente y quedan fuera.
- La configuración del pool no prueba reconexión real a Neon; no usar la base compartida.
- La cobertura global puede cumplir thresholds del repositorio pero no el umbral adicional >85 % por services; medir con reporte.
