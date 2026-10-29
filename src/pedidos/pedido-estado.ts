/**
 * Estados del ciclo de vida de un pedido (`PedidoEstado` en
 * `docs/openapi.yaml` §11.1 y `docs/glossary.md` §3.1).
 *
 * Se modela como unión literal y no como `string` libre, igual que `Rol` y
 * `MetodoPago`: el arreglo `PEDIDO_ESTADOS` es la única fuente para validar el
 * request, tipar la entity y alimentar el `enum` de Swagger.
 *
 * La columna `pedidos.estado` es `varchar(30)` en el legacy. No se usa un
 * `enum` de PostgreSQL para no alterar una tabla compartida con producción
 * (constitución §4); la restricción se valida en el borde HTTP (`UPDATE`) y en
 * el mapa de transiciones del service (MIG-33).
 */
export const PEDIDO_ESTADOS = [
  'pendiente',
  'en_preparacion',
  'listo',
  'entregado',
  'pagado',
  'cancelado',
] as const;

export type PedidoEstado = (typeof PEDIDO_ESTADOS)[number];
