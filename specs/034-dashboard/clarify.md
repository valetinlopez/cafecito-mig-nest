# Clarify — 034-dashboard

## Hallazgos resueltos

1. MIG-34 describe el número de mesa y la cantidad de detalles como `numero_mesa` y `cantidad_items`, mientras que el contrato publicado espera `mesa` e `items`. Se preserva el contrato vigente y se mapean esos datos a sus campos contractuales.
2. MIG-34 fija 50 pedidos recientes. Esto reemplaza la decisión D-04 antigua del módulo, que indicaba 5.
3. La zona horaria no aparece en el ticket. Se mantiene la decisión local D-03: día de negocio `America/Argentina/Buenos_Aires`, con límites convertidos a UTC.
4. Si hay varias cajas abiertas, se consulta con `.find()` y orden descendente por fecha de apertura, usando id descendente como desempate; se muestra la primera.
5. Se confirmó que `items` representa la suma de cantidades de los detalles y que se incluyen pedidos de todos los estados.

## Resultado

No quedan ambigüedades abiertas. La spec queda habilitada para implementación.