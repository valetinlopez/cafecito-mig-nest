import type { Usuario } from '../../users/entities/usuario.entity.js';
import { ForgotPasswordResponseDto } from './forgot-password-response.dto.js';
import { MessageResponseDto } from './message-response.dto.js';
import { TokenResponseDto } from './token-response.dto.js';

/**
 * DTOs de respuesta de auth (MIG-23).
 *
 * Congelan el shape del contrato y, sobre todo, que el hash de la contraseña no
 * pueda llegar al JSON (constitución §8).
 */
describe('TokenResponseDto', () => {
  const usuario: Usuario = {
    id: 1,
    nombre: 'Nahuel Gauna',
    email: 'admin@cafecito.com',
    passwordHash: '$2b$10$super-secreto',
    rol: 'admin',
    activo: true,
  };

  it('mapea el token y el usuario público', () => {
    const dto = TokenResponseDto.fromEntity('jwt-firmado', usuario);

    expect(dto).toEqual({
      access_token: 'jwt-firmado',
      token_type: 'bearer',
      usuario: {
        id: 1,
        nombre: 'Nahuel Gauna',
        email: 'admin@cafecito.com',
        rol: 'admin',
        activo: true,
      },
    });
  });

  it('nunca incluye el hash de la contraseña', () => {
    const dto = TokenResponseDto.fromEntity('jwt-firmado', usuario);

    expect(JSON.stringify(dto)).not.toContain('super-secreto');
    expect(dto.usuario).not.toHaveProperty('passwordHash');
  });
});

describe('MessageResponseDto', () => {
  it('envuelve el mensaje de éxito', () => {
    expect(
      MessageResponseDto.fromMessage('Contraseña actualizada correctamente'),
    ).toEqual({
      message: 'Contraseña actualizada correctamente',
    });
  });
});

describe('ForgotPasswordResponseDto', () => {
  it('en desarrollo expone el token', () => {
    const dto = ForgotPasswordResponseDto.fromResetToken('reset-token');

    expect(dto.reset_token).toBe('reset-token');
    expect(dto.message).toContain('Si el email está registrado');
  });

  it('fuera de desarrollo emite null explícito', () => {
    const dto = ForgotPasswordResponseDto.fromResetToken(null);

    expect(dto.reset_token).toBeNull();
    expect(Object.keys(dto)).toEqual(['message', 'reset_token']);
  });
});
