import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import {
  INVALID_TOKEN_DETAIL,
  TOKEN_WITHOUT_SUBJECT_DETAIL,
  USER_NOT_FOUND_OR_INACTIVE_DETAIL,
} from '../../common/auth/auth-messages.js';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.js';
import type { AuthConfig } from '../../config/auth.config.js';
import { UsersService } from '../../users/users.service.js';

/**
 * Payload decodificado. `purpose` no existe en un access token: si aparece, el
 * token es de reseteo y se rechaza acá para que no sirva como token de sesión
 * (criterio del epic MIG-4).
 */
interface DecodedPayload {
  sub?: unknown;
  purpose?: unknown;
}

/**
 * Validación del Bearer token (`docs/api-contract.md` §5.4).
 *
 * La firma y la expiración las valida `passport-jwt`; acá se resuelve el
 * usuario contra la base en cada request. Así una baja o desactivación aplica
 * al instante sin esperar a que expire el token de 480 minutos.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    const authConfig = configService.getOrThrow<AuthConfig>('auth');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: authConfig.secretKey,
      algorithms: [authConfig.algorithm],
    });
  }

  async validate(payload: DecodedPayload): Promise<AuthenticatedUser> {
    if (payload.purpose !== undefined) {
      throw new UnauthorizedException(INVALID_TOKEN_DETAIL);
    }

    const id = Number(payload.sub);

    if (!Number.isInteger(id) || id <= 0) {
      throw new UnauthorizedException(TOKEN_WITHOUT_SUBJECT_DETAIL);
    }

    const usuario = await this.usersService.findById(id);

    if (usuario === null || !usuario.activo) {
      throw new UnauthorizedException(USER_NOT_FOUND_OR_INACTIVE_DETAIL);
    }

    return {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      activo: usuario.activo,
    };
  }
}
