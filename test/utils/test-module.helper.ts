import type { ModuleMetadata, Provider, Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { ObjectLiteral } from 'typeorm';
import type { MockRepository } from './mock-repository.js';

/**
 * Provider de Nest para inyectar un repositorio mockeado en el token que
 * genera `@InjectRepository(Entity)`.
 *
 * Evita repetir `{ provide: getRepositoryToken(Entity), useValue: mock }` en
 * cada spec y mantiene el tipado de la entity:
 *
 * ```ts
 * provideMockRepository(Categoria, repository);
 * ```
 */
export function provideMockRepository<T extends ObjectLiteral>(
  entity: Type<T>,
  repository: MockRepository<T>,
): Provider {
  return {
    provide: getRepositoryToken(entity),
    useValue: repository,
  };
}

/**
 * Compila un `TestingModule` arbitrario con `Test.createTestingModule`.
 * Útil para controllers, guards o providers que no son un service único.
 */
export async function createTestModule(
  metadata: ModuleMetadata,
): Promise<TestingModule> {
  return Test.createTestingModule(metadata).compile();
}

/**
 * Compila el módulo de un service con sus repositorios mockeados y devuelve
 * ambos: el test configura los mocks sobre las mismas instancias.
 *
 * ```ts
 * const { service, module } = await createServiceTestModule(CategoriasService, [
 *   provideMockRepository(Categoria, repository),
 * ]);
 * ```
 *
 * Cerrar el módulo en `afterEach` (`await module.close()`) libera los recursos
 * que Nest haya creado.
 */
export async function createServiceTestModule<S>(
  service: Type<S>,
  providers: Provider[] = [],
): Promise<{ module: TestingModule; service: S }> {
  const module = await createTestModule({ providers: [service, ...providers] });

  return { module, service: module.get<S>(service) };
}
