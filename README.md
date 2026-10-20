# Cafecitoapp — Backend NestJS

Backend de gestión gastronómica de Cafecitoapp, en migración de **FastAPI (Python)** a **NestJS**.

> El backend legacy en FastAPI permanece operativo hasta el cutover (MIG-42).

## Stack

- **NestJS 12** (Express) + **TypeScript 6** (ESM, `module: nodenext`)
- **TypeORM** + **PostgreSQL** (configuración en MIG-19)
- **class-validator / class-transformer** para DTOs
- **Passport + JWT** para autenticación
- **Vitest** para tests
- **ESLint + Prettier** para calidad de código

## Requisitos

- Node.js >= 24
- npm >= 11

## Puesta en marcha

```bash
npm install
copy .env.example .env
npm run start:dev
```

El servidor queda disponible en `http://localhost:3000` y el health check responde en `GET /`:

```json
{
  "status": "ok",
  "service": "backend-nest",
  "version": "0.0.1",
  "timestamp": "2026-10-19T23:00:00.000Z",
  "uptime": 12
}
```

## Documentación de API

- [`docs/api-contract.md`](docs/api-contract.md) — contrato de API (MIG-17): decisiones de diseño, inventario de los 32 endpoints + health check y matriz de compatibilidad con el frontend.
- [`docs/openapi.yaml`](docs/openapi.yaml) — especificación OpenAPI 3.1 del contrato.

## Scripts

| Script                 | Descripción                 |
| ---------------------- | --------------------------- |
| `npm run start:dev`    | Servidor en modo watch      |
| `npm run build`        | Compila a `dist/`           |
| `npm run start:prod`   | Ejecuta el build            |
| `npm run lint`         | ESLint                      |
| `npm run lint:fix`     | ESLint con autocorrección   |
| `npm run typecheck`    | TypeScript (`tsc --noEmit`) |
| `npm run format`       | Prettier (escribe)          |
| `npm run format:check` | Prettier (verifica)         |
| `npm test`             | Tests unitarios (Vitest)    |
| `npm run test:e2e`     | Tests end-to-end            |

## Estructura

```
src/
├── auth/            # Autenticación (MIG-22 a MIG-25)
├── users/           # Usuarios
├── empleados/       # Empleados
├── mesas/           # Mesas
├── categorias/      # Categorías
├── productos/       # Productos
├── pedidos/         # Pedidos
├── pagos/           # Pagos
├── caja/            # Caja
├── dashboard/       # KPIs
├── reportes/        # Reportes de ventas
├── health/          # Health check (GET /)
├── common/          # Guards, pipes, filters, interceptors, decorators
├── config/          # Configuración y validación de entorno
├── database/        # Data source, migraciones y seeds
├── app.module.ts
└── main.ts
```

## Convenciones

- Arquitectura **feature-based**: cada módulo agrupa controller, service, entity y DTOs.
- Imports internos con extensión `.js` (requerido por ESM + `nodenext`).
- TypeScript estricto: `strict`, `noUnusedLocals`, `noUnusedParameters`.
- Formato al guardar con Prettier y autocorrección de ESLint (`.vscode/settings.json`).

## Estado de la migración

Sprint **S0 — Bootcamp**. La conexión a base de datos, CORS, validación global, autenticación y módulos de negocio se implementan en los tickets siguientes (MIG-17 a MIG-44).
