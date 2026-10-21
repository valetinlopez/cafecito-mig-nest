import { Module } from '@nestjs/common';
import type { DynamicModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import type { ConfigType } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import databaseConfig from '../config/database.config.js';
import { createTypeOrmOptions } from './typeorm-options.js';

/**
 * Conexión PostgreSQL de la aplicación (MIG-19).
 *
 * `TypeOrmModule.forRootAsync` publica el `DataSource` de forma global, así que
 * cada feature module solo necesita `TypeOrmModule.forFeature([Entity])`.
 *
 * Las opciones viven en `typeorm-options.ts` para reutilizarlas desde el CLI de
 * migraciones y poder testearlas sin levantar Nest.
 */
@Module({})
export class DatabaseModule {
  static forRoot(): DynamicModule {
    return {
      module: DatabaseModule,
      imports: [
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          inject: [databaseConfig.KEY],
          useFactory: (config: ConfigType<typeof databaseConfig>) =>
            createTypeOrmOptions(config),
        }),
      ],
    };
  }
}
