import { Logger } from '@nestjs/common';
import dataSource from './data-source.js';
import { assertSeedAllowed } from './seed-guard.js';
import { runSeed } from './seed-runner.js';
import type { SeedReport } from './seed-runner.js';

const logger = new Logger('Seed');

function describe(report: SeedReport): string {
  const insertadas = (['usuarios', 'categorias', 'productos', 'mesas'] as const)
    .filter((tabla) => report[tabla] > 0)
    .map((tabla) => `${tabla}: ${report[tabla]}`);

  if (insertadas.length === 0) {
    return 'La base ya tenía datos en todas las tablas; no se insertó nada.';
  }

  return `Seed completo (${insertadas.join(', ')}).`;
}

async function main(): Promise<void> {
  assertSeedAllowed();
  await dataSource.initialize();

  try {
    const report = await dataSource.transaction((manager) =>
      runSeed(manager, logger),
    );
    logger.log(describe(report));

    if (report.omitidas.length > 0) {
      logger.warn(`Tablas omitidas: ${report.omitidas.join(', ')}.`);
    }
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  logger.error(`El seed falló: ${message}`);
  process.exitCode = 1;
});
