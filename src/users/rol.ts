/**
 * Roles del sistema (`Rol` en `docs/openapi.yaml` §11.1).
 *
 * Se modela como unión literal y no como `string` libre (constitución §10). El
 * arreglo `ROLES` es la única fuente para `@IsIn()` y para el enum de Swagger,
 * así el DTO, la documentación y la base no se desincronizan.
 *
 * La columna `usuarios.rol` es `varchar(20)` en el legacy; las restricciones se
 * validan en el borde HTTP (DTO) y no con un `enum` de PostgreSQL, para no
 * alterar una tabla compartida con producción (constitución §4).
 */
export const ROLES = ['admin', 'mozo'] as const;

export type Rol = (typeof ROLES)[number];
