import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { QueryFailedError } from 'typeorm';
import { USER_NOT_FOUND_OR_INACTIVE_DETAIL } from '../common/auth/auth-messages.js';
import type { AppConfig } from '../config/app.config.js';
import { NodeEnvironment } from '../config/env.helpers.js';
import type { Usuario } from '../users/entities/usuario.entity.js';
import { UsuarioResponseDto } from '../users/dto/usuario-response.dto.js';
import { UsersService } from '../users/users.service.js';
import {
  CURRENT_PASSWORD_INVALID_DETAIL,
  EMAIL_ALREADY_IN_USE_DETAIL,
  EMAIL_ALREADY_REGISTERED_DETAIL,
  INVALID_CREDENTIALS_DETAIL,
  PASSWORD_CHANGED_MESSAGE,
  PASSWORD_RESET_MESSAGE,
  RESET_TOKEN_INVALID_DETAIL,
} from './auth-messages.js';
import type { ChangePasswordDto } from './dto/change-password.dto.js';
import { ForgotPasswordResponseDto } from './dto/forgot-password-response.dto.js';
import type { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import { MessageResponseDto } from './dto/message-response.dto.js';
import type { RegisterDto } from './dto/register.dto.js';
import type { ResetPasswordDto } from './dto/reset-password.dto.js';
import { TokenResponseDto } from './dto/token-response.dto.js';
import type { UpdateProfileDto } from './dto/update-profile.dto.js';
import {
  RESET_TOKEN_EXPIRES_IN_SECONDS,
  RESET_TOKEN_PURPOSE,
  parseUserIdClaim,
} from './jwt-payload.js';
import type { AccessTokenPayload, ResetTokenPayload } from './jwt-payload.js';

/** Costo de bcrypt. El legacy usa el default (10) y así se mantiene. */
const BCRYPT_ROUNDS = 10;

/**
 * Reglas de negocio de autenticación (MIG-23/25).
 *
 * El controller solo traduce HTTP; acá viven la verificación de credenciales,
 * el hashing, la firma de tokens y todas las validaciones de negocio
 * (constitución §3). La persistencia se delega a `UsersService`.
 */
@Injectable()
export class AuthService {
  private readonly appConfig: AppConfig;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    configService: ConfigService,
  ) {
    this.appConfig = configService.getOrThrow<AppConfig>('app');
  }

  /**
   * `POST /auth/login` → `200 TokenResponse`.
   *
   * El orden importa: primero se verifica la contraseña y después el estado.
   * Un email inexistente y una contraseña incorrecta responden lo mismo para
   * no filtrar qué cuentas existen.
   */
  async login(dto: LoginDto): Promise<TokenResponseDto> {
    const usuario = await this.usersService.findByEmail(dto.email);

    if (usuario === null) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_DETAIL);
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      usuario.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_DETAIL);
    }

    if (!usuario.activo) {
      throw new UnauthorizedException(USER_NOT_FOUND_OR_INACTIVE_DETAIL);
    }

    const accessToken = await this.signAccessToken(usuario);

    return TokenResponseDto.fromEntity(accessToken, usuario);
  }

  /**
   * `POST /auth/register` (admin) → `201 Usuario`.
   *
   * El email duplicado se valida antes para devolver `400` con el mensaje del
   * contrato; si dos requests compiten, la restricción `UNIQUE` de PostgreSQL
   * también se traduce a `400` en lugar de un `500`.
   */
  async register(dto: RegisterDto): Promise<UsuarioResponseDto> {
    if (await this.usersService.existsByEmail(dto.email)) {
      throw new BadRequestException(EMAIL_ALREADY_REGISTERED_DETAIL);
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    try {
      const usuario = await this.usersService.create({
        nombre: dto.nombre,
        email: dto.email,
        passwordHash,
        rol: dto.rol,
      });

      return UsuarioResponseDto.fromEntity(usuario);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BadRequestException(EMAIL_ALREADY_REGISTERED_DETAIL);
      }

      throw error;
    }
  }

  /** `GET /auth/me` → `200 Usuario`. */
  async getProfile(id: number): Promise<UsuarioResponseDto> {
    const usuario = await this.findActiveUsuario(id);

    return UsuarioResponseDto.fromEntity(usuario);
  }

  /** `PATCH /auth/me` → `200 Usuario`. Solo nombre y email; el rol no cambia. */
  async updateProfile(
    id: number,
    dto: UpdateProfileDto,
  ): Promise<UsuarioResponseDto> {
    const usuario = await this.findActiveUsuario(id);

    if (
      dto.email !== undefined &&
      (await this.usersService.existsByEmail(dto.email, usuario.id))
    ) {
      throw new BadRequestException(EMAIL_ALREADY_IN_USE_DETAIL);
    }

    const updated = await this.usersService.update(id, {
      nombre: dto.nombre,
      email: dto.email,
    });

    if (updated === null) {
      throw new UnauthorizedException(USER_NOT_FOUND_OR_INACTIVE_DETAIL);
    }

    return UsuarioResponseDto.fromEntity(updated);
  }

  /** `POST /auth/change-password` → `200 MessageResponse`. */
  async changePassword(
    id: number,
    dto: ChangePasswordDto,
  ): Promise<MessageResponseDto> {
    const usuario = await this.findActiveUsuario(id);

    const passwordMatches = await bcrypt.compare(
      dto.password_actual,
      usuario.passwordHash,
    );

    if (!passwordMatches) {
      throw new BadRequestException(CURRENT_PASSWORD_INVALID_DETAIL);
    }

    const passwordHash = await bcrypt.hash(dto.password_nueva, BCRYPT_ROUNDS);

    await this.usersService.update(id, { passwordHash });

    return MessageResponseDto.fromMessage(PASSWORD_CHANGED_MESSAGE);
  }

  /**
   * `POST /auth/forgot-password` → `200` **siempre**.
   *
   * No revela si el email existe: la respuesta es la misma y el token solo se
   * emite para un usuario activo. En producción el `reset_token` se descarta
   * (D-15 del contrato, D-04 de `auth`).
   */
  async forgotPassword(
    dto: ForgotPasswordDto,
  ): Promise<ForgotPasswordResponseDto> {
    const usuario = await this.usersService.findByEmail(dto.email);
    const resetToken =
      usuario !== null && usuario.activo
        ? await this.signResetToken(usuario)
        : null;

    const exposedToken = this.isDevelopment() ? resetToken : null;

    return ForgotPasswordResponseDto.fromResetToken(exposedToken);
  }

  /**
   * `POST /auth/reset-password` → `200 MessageResponse`.
   *
  * El token debe tener `purpose = password_reset` y estar vigente. Un access
  * token con firma válida se rechaza con `400 Token inválido o expirado`.
   */
  async resetPassword(dto: ResetPasswordDto): Promise<MessageResponseDto> {
    const usuarioId = await this.verifyResetToken(dto.token);
    const passwordHash = await bcrypt.hash(dto.password_nueva, BCRYPT_ROUNDS);

    const updated = await this.usersService.update(usuarioId, { passwordHash });

    if (updated === null) {
      throw new BadRequestException(RESET_TOKEN_INVALID_DETAIL);
    }

    return MessageResponseDto.fromMessage(PASSWORD_RESET_MESSAGE);
  }

  private async signAccessToken(usuario: Usuario): Promise<string> {
    const payload: AccessTokenPayload = {
      sub: String(usuario.id),
      rol: usuario.rol,
    };

    return this.jwtService.signAsync(payload);
  }

  private async signResetToken(usuario: Usuario): Promise<string> {
    const payload: ResetTokenPayload = {
      sub: String(usuario.id),
      purpose: RESET_TOKEN_PURPOSE,
    };

    return this.jwtService.signAsync(payload, {
      expiresIn: RESET_TOKEN_EXPIRES_IN_SECONDS,
    });
  }

  private async verifyResetToken(token: string): Promise<number> {
    let payload: { sub?: unknown; purpose?: unknown };

    try {
      payload =
        await this.jwtService.verifyAsync<Partial<ResetTokenPayload>>(token);
    } catch {
      throw new BadRequestException(RESET_TOKEN_INVALID_DETAIL);
    }

    if (payload.purpose !== RESET_TOKEN_PURPOSE) {
      throw new BadRequestException(RESET_TOKEN_INVALID_DETAIL);
    }

    const id = parseUserIdClaim(payload.sub);
    if (id === null) {
      throw new BadRequestException(RESET_TOKEN_INVALID_DETAIL);
    }

    return id;
  }

  /**
   * El token identifica al usuario, pero la fila se relee: si fue desactivado
   * después de emitirlo, el perfil deja de estar disponible (`401`).
   */
  private async findActiveUsuario(id: number): Promise<Usuario> {
    const usuario = await this.usersService.findById(id);

    if (usuario === null || !usuario.activo) {
      throw new UnauthorizedException(USER_NOT_FOUND_OR_INACTIVE_DETAIL);
    }

    return usuario;
  }

  private isDevelopment(): boolean {
    return this.appConfig.environment === NodeEnvironment.Development;
  }
}

/**
 * PostgreSQL devuelve `23505` (`unique_violation`) si dos altas compiten por el
 * mismo email entre el `existsByEmail` y el `INSERT`.
 */
function isUniqueViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }

  const driverError = error.driverError as { code?: string };

  return driverError.code === '23505';
}
