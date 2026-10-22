import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  // Resolves the path aliases declared in tsconfig.json, including the ones
  // added by `nest g library`. Es el equivalente a `moduleNameMapper` de Jest.
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
    setupFiles: ['./test/setup-env.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      // Se excluye el bootstrap y el mapeo (entities/DTOs/modules), que se
      // verifican por e2e o por `synchronize`. Los controllers también quedan
      // cubiertos por el contrato HTTP de `npm run test:e2e`.
      exclude: [
        'src/main.ts',
        'src/app.module.ts',
        'src/app.setup.ts',
        'src/**/*.module.ts',
        'src/**/*.controller.ts',
        'src/**/*.entity.ts',
        'src/**/*.dto.ts',
        'src/database/data-source.ts',
        'src/database/migrations/**',
        'src/**/*.spec.ts',
      ],
      // Piso actual del código implementado. Los módulos nuevos no pueden
      // bajar la cobertura global sin agregar sus tests (Constitución §5).
      // `auth.config.ts` todavía no tiene spec (llega con MIG-22/23), por eso
      // el umbral de funciones queda en 80.
      thresholds: {
        statements: 90,
        branches: 85,
        functions: 80,
        lines: 90,
      },
    },
  },
});
