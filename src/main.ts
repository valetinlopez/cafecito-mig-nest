import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';
import { pinProcessTimezone } from './common/time/process-timezone.js';
import type { AppConfig } from './config/app.config.js';

async function bootstrap(): Promise<void> {
  // Antes de crear la conexión: `pg` interpreta `timestamp without time zone`
  // con la zona del proceso (ADR 0003, MIG-43).
  pinProcessTimezone();

  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.getOrThrow<number>('PORT');
  const { corsOrigins } = configService.getOrThrow<AppConfig>('app');

  await configureApp(app, { corsOrigins });

  await app.listen(port);
}

await bootstrap();
