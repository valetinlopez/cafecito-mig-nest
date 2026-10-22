import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { pinProcessTimezone } from '../common/time/process-timezone.js';
import { loadDatabaseConfig } from '../config/database.config.js';
import { createDataSourceOptions } from './typeorm-options.js';

/**
 * DataSource que consume el CLI de TypeORM (`migration:generate`, `migration:run`,
 * `schema:log`). No lo importa la aplicación: Nest usa `DatabaseModule`.
 *
 * El CLI corre sobre `dist/` para que TypeScript compile las entities y las
 * migraciones con los decoradores de TypeORM. Los scripts de `package.json`
 * cargan `.env` con `node --env-file-if-exists=.env`.
 *
 *   npm run migration:generate -- src/database/migrations/Nombre -d dist/database/data-source.js
 */
pinProcessTimezone();

const config = loadDatabaseConfig();

export default new DataSource({
  ...createDataSourceOptions(config),
  // El CLI de migraciones nunca sincroniza el esquema: genera o aplica SQL
  // versionado. `synchronize` queda reservado al arranque en desarrollo local.
  synchronize: false,
  migrationsRun: false,
  entities: [join(import.meta.dirname, '..', '**', '*.entity.js')],
  migrations: [join(import.meta.dirname, 'migrations', '*.js')],
});
