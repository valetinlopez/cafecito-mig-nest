# Clarify — 035-regresion-services

## Aclaraciones resueltas

1. El usuario eligió mantener Vitest como runner único; no se instalará Jest ni se migrarán 75 casos a un segundo runner.
2. El usuario eligió diferir Reportes. No hay service implementado y MIG-35 no agregará esa funcionalidad.
3. La suite existente ya contiene la mayoría de los casos enumerados originalmente. Esta entrega agrega huecos verificables, no duplica cada caso ni fuerza un total artificial de 75 tests.
4. CFB-128 no autoriza crear múltiples pedidos activos: MIG-33 mantiene la regla de máximo uno. Se valida que encontrar un activo resulte en rechazo de negocio y no en un error de cardinalidad/500.
5. CFB-121 (borrar producto usado por pedidos) requiere una operación DELETE aún no implementada; se difiere al ticket dueño de esa funcionalidad.
6. Las pruebas de locks son unitarias con mocks y no afirman validar el comportamiento real de PostgreSQL.

## Resultado

El alcance de pruebas para comportamientos implementados queda sin preguntas bloqueantes. La implementación de Reportes, la eliminación de productos y cualquier cambio de runner quedan expresamente fuera de MIG-35.
