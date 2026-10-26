import type { TestingModule } from '@nestjs/testing';
import {
  createMockRepository,
  type MockRepository,
} from '../../test/utils/mock-repository.js';
import {
  createServiceTestModule,
  provideMockRepository,
} from '../../test/utils/test-module.helper.js';
import { Usuario } from './entities/usuario.entity.js';
import { UsersService } from './users.service.js';

/**
 * Acceso a datos de `usuarios` (MIG-25).
 *
 * Repositorio mockeado: se verifica la query que arma el service y la
 * normalización del email, sin PostgreSQL (constitución §5).
 */
describe('UsersService', () => {
  let module: TestingModule;
  let service: UsersService;
  let repository: MockRepository<Usuario>;

  function buildUsuario(overrides: Partial<Usuario> = {}): Usuario {
    return {
      id: 1,
      nombre: 'Valentín López',
      email: 'valentin@cafecito.com',
      passwordHash: '$2b$10$hash',
      rol: 'mozo',
      activo: true,
      ...overrides,
    };
  }

  beforeEach(async () => {
    repository = createMockRepository<Usuario>();

    ({ module, service } = await createServiceTestModule(UsersService, [
      provideMockRepository(Usuario, repository),
    ]));
  });

  afterEach(async () => {
    await module.close();
  });

  describe('findByEmail', () => {
    it('busca con el email normalizado en minúsculas y sin espacios', async () => {
      repository.findOne.mockResolvedValue(buildUsuario());

      const usuario = await service.findByEmail('  VALENTIN@Cafecito.com ');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { email: 'valentin@cafecito.com' },
      });
      expect(usuario).toEqual(buildUsuario());
    });

    it('devuelve null cuando el email no existe', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.findByEmail('nadie@cafecito.com'),
      ).resolves.toBeNull();
    });
  });

  describe('findById', () => {
    it('devuelve el usuario por id', async () => {
      repository.findOne.mockResolvedValue(buildUsuario({ id: 7 }));

      const usuario = await service.findById(7);

      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 7 } });
      expect(usuario?.id).toBe(7);
    });

    it('devuelve null cuando no existe', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findById(99)).resolves.toBeNull();
    });
  });

  describe('existsByEmail', () => {
    it('devuelve true cuando el email pertenece a otro usuario', async () => {
      repository.findOne.mockResolvedValue(buildUsuario({ id: 2 }));

      await expect(
        service.existsByEmail('valentin@cafecito.com', 1),
      ).resolves.toBe(true);
    });

    it('devuelve false cuando el email es del propio usuario', async () => {
      repository.findOne.mockResolvedValue(buildUsuario({ id: 1 }));

      await expect(
        service.existsByEmail('valentin@cafecito.com', 1),
      ).resolves.toBe(false);
    });

    it('devuelve false cuando el email no existe', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.existsByEmail('nadie@cafecito.com')).resolves.toBe(
        false,
      );
    });
  });

  describe('create', () => {
    it('normaliza el email y persiste el hash recibido', async () => {
      const created = buildUsuario();
      repository.create.mockReturnValue(created);
      repository.save.mockResolvedValue(created);

      const usuario = await service.create({
        nombre: 'Valentín López',
        email: '  VALENTIN@Cafecito.com ',
        passwordHash: '$2b$10$hash',
        rol: 'mozo',
      });

      expect(repository.create).toHaveBeenCalledWith({
        nombre: 'Valentín López',
        email: 'valentin@cafecito.com',
        passwordHash: '$2b$10$hash',
        rol: 'mozo',
      });
      expect(repository.save).toHaveBeenCalledWith(created);
      expect(usuario).toBe(created);
    });
  });

  describe('update', () => {
    it('aplica solo los campos presentes', async () => {
      const usuario = buildUsuario();
      repository.findOne.mockResolvedValue(usuario);
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as Usuario),
      );

      const updated = await service.update(1, {
        nombre: 'Valentín G. López',
      });

      expect(repository.save).toHaveBeenCalledTimes(1);
      expect(updated?.nombre).toBe('Valentín G. López');
      expect(updated?.email).toBe('valentin@cafecito.com');
      expect(updated?.passwordHash).toBe('$2b$10$hash');
      expect(updated?.activo).toBe(true);
    });

    it('normaliza el email cuando se actualiza', async () => {
      const usuario = buildUsuario();
      repository.findOne.mockResolvedValue(usuario);
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as Usuario),
      );

      const updated = await service.update(1, {
        email: ' NUEVO@Cafecito.com ',
      });

      expect(updated?.email).toBe('nuevo@cafecito.com');
    });

    it('devuelve null y no guarda cuando el usuario no existe', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.update(99, { activo: false })).resolves.toBeNull();
      expect(repository.save).not.toHaveBeenCalled();
    });
  });
});
