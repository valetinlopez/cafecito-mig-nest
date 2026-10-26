import { BadRequestException, NotFoundException } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { QueryFailedError } from 'typeorm';
import { createServiceTestModule } from '../../test/utils/test-module.helper.js';
import type { Usuario } from '../users/entities/usuario.entity.js';
import { UsersService } from '../users/users.service.js';
import { EmpleadosService } from './empleados.service.js';

const PLAIN_PASSWORD = 'secreto123';

function queryFailedWith(code: string): QueryFailedError<Error & { code: string }> {
  return new QueryFailedError(
    'INSERT INTO usuarios',
    [],
    Object.assign(new Error('driver error'), { code }),
  );
}

describe('EmpleadosService', () => {
  let module: Awaited<ReturnType<typeof createServiceTestModule>>['module'];
  let service: EmpleadosService;

  const usersService = {
    findAll: vi.fn<UsersService['findAll']>(),
    findById: vi.fn<UsersService['findById']>(),
    existsByEmail: vi.fn<UsersService['existsByEmail']>(),
    create: vi.fn<UsersService['create']>(),
    update: vi.fn<UsersService['update']>(),
  };

  function buildUsuario(overrides: Partial<Usuario> = {}): Usuario {
    return {
      id: 2,
      nombre: 'Valentín López',
      email: 'valentin@cafecito.com',
      passwordHash: '$2b$10$hash',
      rol: 'mozo',
      activo: true,
      ...overrides,
    };
  }

  beforeEach(async () => {
    ({ module, service } = await createServiceTestModule(EmpleadosService, [
      { provide: UsersService, useValue: usersService },
    ]));
  });

  afterEach(async () => {
    vi.clearAllMocks();
    await module.close();
  });

  describe('getAllEmpleados', () => {
    it('mapea todos los usuarios al DTO público y acepta lista vacía', async () => {
      usersService.findAll.mockResolvedValue([
        buildUsuario(),
        buildUsuario({ id: 1, rol: 'admin', nombre: 'Nahuel' }),
      ]);

      const response = await service.getAllEmpleados();

      expect(response).toEqual([
        {
          id: 2,
          nombre: 'Valentín López',
          email: 'valentin@cafecito.com',
          rol: 'mozo',
          activo: true,
        },
        {
          id: 1,
          nombre: 'Nahuel',
          email: 'valentin@cafecito.com',
          rol: 'admin',
          activo: true,
        },
      ]);
      expect(JSON.stringify(response)).not.toContain('passwordHash');

      usersService.findAll.mockResolvedValue([]);
      await expect(service.getAllEmpleados()).resolves.toEqual([]);
    });
  });

  describe('createEmpleado', () => {
    it('fuerza rol mozo y guarda un hash verificable', async () => {
      usersService.existsByEmail.mockResolvedValue(false);
      usersService.create.mockImplementation((data) =>
        Promise.resolve(
          buildUsuario({ passwordHash: data.passwordHash, rol: data.rol }),
        ),
      );

      const response = await service.createEmpleado({
        nombre: 'Valentín López',
        email: 'Valentin@cafecito.com',
        password: PLAIN_PASSWORD,
      });
      const createArg = usersService.create.mock.calls[0]?.[0];

      expect(createArg?.rol).toBe('mozo');
      expect(createArg?.passwordHash).not.toBe(PLAIN_PASSWORD);
      await expect(
        bcrypt.compare(PLAIN_PASSWORD, createArg?.passwordHash ?? ''),
      ).resolves.toBe(true);
      expect(response).not.toHaveProperty('passwordHash');
    });

    it('rechaza email existente sin crear usuario', async () => {
      usersService.existsByEmail.mockResolvedValue(true);

      await expect(
        service.createEmpleado({
          nombre: 'Valentín',
          email: 'valentin@cafecito.com',
          password: PLAIN_PASSWORD,
        }),
      ).rejects.toEqual(new BadRequestException('El email ya está registrado'));
      expect(usersService.create).not.toHaveBeenCalled();
    });

    it('traduce una carrera UNIQUE a 400', async () => {
      usersService.existsByEmail.mockResolvedValue(false);
      usersService.create.mockRejectedValue(queryFailedWith('23505'));

      await expect(
        service.createEmpleado({
          nombre: 'Valentín',
          email: 'valentin@cafecito.com',
          password: PLAIN_PASSWORD,
        }),
      ).rejects.toEqual(new BadRequestException('El email ya está registrado'));
    });
  });

  describe('updateEmpleado', () => {
    it('actualiza los campos permitidos y devuelve DTO', async () => {
      usersService.findById.mockResolvedValue(buildUsuario());
      usersService.existsByEmail.mockResolvedValue(false);
      usersService.update.mockResolvedValue(
        buildUsuario({ nombre: 'Valentín G.', activo: false }),
      );

      const response = await service.updateEmpleado(2, 1, {
        nombre: 'Valentín G.',
        activo: false,
      });

      expect(usersService.update).toHaveBeenCalledWith(2, {
        nombre: 'Valentín G.',
        email: undefined,
        activo: false,
      });
      expect(response.nombre).toBe('Valentín G.');
      expect(response.activo).toBe(false);
    });

    it('rechaza auto-desactivación', async () => {
      usersService.findById.mockResolvedValue(buildUsuario({ id: 1, rol: 'admin' }));

      await expect(
        service.updateEmpleado(1, 1, { activo: false }),
      ).rejects.toEqual(
        new BadRequestException('No podés desactivar tu propio usuario'),
      );
      expect(usersService.update).not.toHaveBeenCalled();
    });

    it('rechaza email usado por otro usuario', async () => {
      usersService.findById.mockResolvedValue(buildUsuario());
      usersService.existsByEmail.mockResolvedValue(true);

      await expect(
        service.updateEmpleado(2, 1, { email: 'otro@cafecito.com' }),
      ).rejects.toEqual(
        new BadRequestException('El email ya está en uso por otro usuario'),
      );
      expect(usersService.update).not.toHaveBeenCalled();
    });

    it('responde 404 si el empleado no existe', async () => {
      usersService.findById.mockResolvedValue(null);

      await expect(
        service.updateEmpleado(99, 1, { activo: false }),
      ).rejects.toEqual(new NotFoundException('Empleado no encontrado'));
      expect(usersService.update).not.toHaveBeenCalled();
    });
  });
});
