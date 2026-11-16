import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/**
 * Cableado de la documentación interactiva (MIG-40).
 *
 * La UI vive en la raíz, fuera de `/api/v1`, igual que el `/docs` de FastAPI.
 * `useGlobalPrefix` queda en su valor por defecto (`false`) a propósito: el
 * prefijo aplica a los paths del documento, no a la ruta de la UI.
 */
export const SWAGGER_PATH = 'docs';

/** JSON OpenAPI consumible por herramientas (equivalente a `/openapi.json`). */
export const SWAGGER_JSON_PATH = 'docs-json';

const API_TITLE = 'CafecitoApp API';
const API_VERSION = '1.0.0';

const API_DESCRIPTION = [
  'API del backend NestJS de CafecitoApp, migrada desde FastAPI (MIG-40).',
  '',
  'Reglas transversales del contrato:',
  '- Todos los paths viven bajo `/api/v1`, excepto el health check (`GET /`).',
  '- Todo error responde `{ "detail": "mensaje" }` (ADR 0002).',
  '- Los errores de validación responden `422` (ADR 0001).',
  '- Montos y precios son números JSON, no strings (ADR 0004).',
  '- Las fechas son ISO-8601 UTC con `Z` (ADR 0003 y 0007).',
  '- Las colecciones aceptan con y sin barra final, sin redirect (ADR 0005).',
  '',
  'El contrato funcional y la matriz de compatibilidad están en `docs/api-contract.md`.',
].join('\n');

/**
 * Orden y descripción de los tags: el mismo que usa `docs/openapi.yaml` para
 * que la UI y el contrato congelado se lean igual.
 */
const API_TAGS = [
  { name: 'Auth', description: 'Autenticación y perfil del usuario.' },
  { name: 'Mesas', description: 'Mesas del local y su estado.' },
  { name: 'Productos', description: 'Catálogo de productos.' },
  {
    name: 'Categorías',
    description: 'Categorías de productos (solo lectura).',
  },
  { name: 'Pedidos', description: 'Pedidos y cobro.' },
  {
    name: 'Caja',
    description: 'Apertura, cierre, historial y movimientos de caja.',
  },
  { name: 'Dashboard', description: 'KPIs del dashboard.' },
  { name: 'Empleados', description: 'Gestión de empleados (usuarios).' },
  { name: 'Reportes', description: 'Reporte de ventas por rango de fechas.' },
  { name: 'Health', description: 'Health check.' },
] as const;

/**
 * Publica Swagger UI y el documento OpenAPI generado desde los decoradores.
 *
 * Debe llamarse **antes** de `app.init()`: el fallback 404 de `configureApp`
 * se registra después y, si la documentación quedara detrás, `/docs` respondería
 * `{ "detail": ... }` en lugar de la UI.
 */
export function setupSwagger(app: INestApplication): void {
  const document = SwaggerModule.createDocument(app, buildDocumentConfig());

  SwaggerModule.setup(SWAGGER_PATH, app, document, {
    jsonDocumentUrl: SWAGGER_JSON_PATH,
    swaggerOptions: {
      // Conserva el Bearer cargado con "Authorize" al recargar la página.
      persistAuthorization: true,
      displayRequestDuration: true,
    },
  });
}

function buildDocumentConfig() {
  const builder = new DocumentBuilder()
    .setTitle(API_TITLE)
    .setDescription(API_DESCRIPTION)
    .setVersion(API_VERSION)
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'bearer',
    );

  return API_TAGS.reduce(
    (config, tag) => config.addTag(tag.name, tag.description),
    builder,
  ).build();
}
