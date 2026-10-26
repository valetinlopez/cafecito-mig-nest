import { ApiProperty } from '@nestjs/swagger';
import { UsuarioResponseDto } from '../../users/dto/usuario-response.dto.js';
import type { Usuario } from '../../users/entities/usuario.entity.js';
import { TOKEN_TYPE } from '../jwt-payload.js';

/**
 * Respuesta de `POST /api/v1/auth/login` (`TokenResponse` en el contrato).
 *
 * `token_type` es siempre `"bearer"`: el front lo usa para construir el header
 * `Authorization`. El usuario va anidado con el shape público, sin hash.
 */
export class TokenResponseDto {
  @ApiProperty({
    description: 'JWT HS256 firmado con `SECRET_KEY`',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  access_token!: string;

  @ApiProperty({
    description: 'Esquema del token',
    example: TOKEN_TYPE,
    enum: [TOKEN_TYPE],
  })
  token_type!: string;

  @ApiProperty({
    description: 'Usuario autenticado',
    type: UsuarioResponseDto,
  })
  usuario!: UsuarioResponseDto;

  static fromEntity(accessToken: string, usuario: Usuario): TokenResponseDto {
    const dto = new TokenResponseDto();
    dto.access_token = accessToken;
    dto.token_type = TOKEN_TYPE;
    dto.usuario = UsuarioResponseDto.fromEntity(usuario);
    return dto;
  }
}
