import { instanceToPlain } from 'class-transformer';
import { UsuarioResponseDto } from './usuario-response.dto.js';
import { Usuario } from '../entities/usuario.entity.js';

/**
 * `UsuarioResponseDto` es el único shape de usuario que cruza el borde HTTP
 * (constitución §8). El test fija dos garantías: mapea exactamente los cinco
 * campos del contrato y no puede arrastrar `password_hash`.
 */
describe('UsuarioResponseDto', () => {
  const entity = Object.assign(new Usuario(), {
    id: 7,
    nombre: 'Valentín López',
    email: 'valentin@cafecito.com',
    passwordHash: '$2b$10$hash-secreto',
    rol: 'admin' as const,
    activo: true,
  });

  it('mapea los campos públicos de la entity', () => {
    const dto = UsuarioResponseDto.fromEntity(entity);

    expect(dto).toBeInstanceOf(UsuarioResponseDto);
    expect(dto).toEqual({
      id: 7,
      nombre: 'Valentín López',
      email: 'valentin@cafecito.com',
      rol: 'admin',
      activo: true,
    });
  });

  it('no declara ni serializa password_hash', () => {
    const dto = UsuarioResponseDto.fromEntity(entity);

    expect(dto).not.toHaveProperty('passwordHash');
    expect(instanceToPlain(dto)).not.toHaveProperty('password_hash');
    expect(JSON.stringify(dto)).not.toContain('hash-secreto');
  });
});
