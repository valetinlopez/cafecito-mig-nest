/** Variable que habilita el seed sobre producción de forma explícita. */
export const SEED_ALLOW_PRODUCTION = 'SEED_ALLOW_PRODUCTION';

const PRODUCTION_ENVIRONMENT = 'production';

/**
 * Bloquea el seed en producción salvo confirmación explícita.
 *
 * La base de Neon es compartida con el backend legacy: cargar datos por error
 * puede duplicar usuarios o dejar la aplicación en un estado inconsistente.
 * El chequeo ocurre antes de abrir la conexión, así no se toca la base.
 */
export function assertSeedAllowed(env: NodeJS.ProcessEnv = process.env): void {
  if (env.NODE_ENV !== PRODUCTION_ENVIRONMENT) {
    return;
  }

  if (env[SEED_ALLOW_PRODUCTION] === 'true') {
    return;
  }

  throw new Error(
    'El seed está bloqueado en producción. Si realmente necesitás cargar datos, ejecutá con SEED_ALLOW_PRODUCTION=true.',
  );
}
