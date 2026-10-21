import { loadAppConfig } from './app.config.js';
import { NodeEnvironment } from './env.helpers.js';

describe('loadAppConfig', () => {
  it('usa el puerto 3000 por defecto', () => {
    expect(loadAppConfig({}).port).toBe(3000);
  });

  it('normaliza los orígenes de CORS', () => {
    const config = loadAppConfig({
      CORS_ORIGINS:
        'http://localhost:3000/, https://app.cafecito.com/ , ,https://admin.cafecito.com',
    });

    expect(config.corsOrigins).toEqual([
      'http://localhost:3000',
      'https://app.cafecito.com',
      'https://admin.cafecito.com',
    ]);
  });

  it('devuelve una lista vacía cuando no hay orígenes configurados', () => {
    expect(loadAppConfig({}).corsOrigins).toEqual([]);
  });

  it('marca producción explícitamente', () => {
    const config = loadAppConfig({ NODE_ENV: 'production' });

    expect(config.environment).toBe(NodeEnvironment.Production);
    expect(config.isProduction).toBe(true);
  });
});
