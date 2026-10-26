import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from '../common/auth/authenticated-user.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { UsuarioResponseDto } from '../users/dto/usuario-response.dto.js';
import { AuthService } from './auth.service.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { ForgotPasswordResponseDto } from './dto/forgot-password-response.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { MessageResponseDto } from './dto/message-response.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { TokenResponseDto } from './dto/token-response.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';

/**
 * Los 7 endpoints de autenticación (MIG-23, contrato §6.1).
 *
 * El controller solo traduce HTTP ↔ service: no verifica credenciales ni toca
 * el repositorio (constitución §3). Los guards se declaran acá y no como
 * `APP_GUARD` global, con `@Public()` explícito en las tres rutas abiertas
 * (D-08 de `auth`).
 *
 * `operationId` replica 1:1 `docs/openapi.yaml` para que los generadores de
 * SDK no cambien de firma (convenciones §9.1).
 */
@ApiTags('Auth')
@Controller('auth')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'login',
    summary: 'Iniciar sesión',
    description:
      'Valida email y contraseña y devuelve un JWT HS256 junto con el usuario. No requiere token.',
  })
  @ApiOkResponse({
    description: 'Token JWT y datos del usuario.',
    type: TokenResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Email o contraseña incorrectos.',
  })
  @ApiUnprocessableEntityResponse({
    description: "Body inválido (`Campo '<campo>': <mensaje>`).",
  })
  login(@Body() dto: LoginDto): Promise<TokenResponseDto> {
    return this.authService.login(dto);
  }

  @Roles('admin')
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({
    operationId: 'register',
    summary: 'Registrar usuario (admin)',
    description:
      'Alta administrativa de un usuario con rol `admin` o `mozo`. Requiere JWT de administrador.',
  })
  @ApiCreatedResponse({
    description: 'Usuario creado.',
    type: UsuarioResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'El email ya está registrado.',
  })
  @ApiUnauthorizedResponse({
    description: 'Token ausente, inválido o expirado.',
  })
  @ApiForbiddenResponse({
    description: 'Se requiere rol de administrador.',
  })
  @ApiUnprocessableEntityResponse({
    description: "Body inválido (`Campo '<campo>': <mensaje>`).",
  })
  register(@Body() dto: RegisterDto): Promise<UsuarioResponseDto> {
    return this.authService.register(dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({
    operationId: 'getMe',
    summary: 'Obtener usuario autenticado',
    description:
      'Devuelve el usuario dueño del token. Sirve para restaurar la sesión del front al recargar.',
  })
  @ApiOkResponse({
    description: 'Usuario autenticado.',
    type: UsuarioResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Token ausente, inválido o expirado.',
  })
  getMe(
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<UsuarioResponseDto> {
    return this.authService.getProfile(usuario.id);
  }

  @Patch('me')
  @ApiBearerAuth()
  @ApiOperation({
    operationId: 'updateMe',
    summary: 'Actualizar perfil propio',
    description:
      'Actualiza nombre y/o email del usuario autenticado. El rol no se puede modificar desde este endpoint.',
  })
  @ApiOkResponse({
    description: 'Usuario actualizado.',
    type: UsuarioResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'El email ya está en uso por otro usuario.',
  })
  @ApiUnauthorizedResponse({
    description: 'Token ausente, inválido o expirado.',
  })
  @ApiUnprocessableEntityResponse({
    description: "Body inválido (`Campo '<campo>': <mensaje>`).",
  })
  updateMe(
    @CurrentUser() usuario: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<UsuarioResponseDto> {
    return this.authService.updateProfile(usuario.id, dto);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    operationId: 'changePassword',
    summary: 'Cambiar contraseña',
    description:
      'Verifica la contraseña actual y guarda el hash de la nueva. Requiere JWT de cualquier rol.',
  })
  @ApiOkResponse({
    description: 'Contraseña actualizada.',
    type: MessageResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'La contraseña actual es incorrecta.',
  })
  @ApiUnauthorizedResponse({
    description: 'Token ausente, inválido o expirado.',
  })
  @ApiUnprocessableEntityResponse({
    description: "Body inválido (`Campo '<campo>': <mensaje>`).",
  })
  changePassword(
    @CurrentUser() usuario: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ): Promise<MessageResponseDto> {
    return this.authService.changePassword(usuario.id, dto);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'forgotPassword',
    summary: 'Solicitar recuperación de contraseña',
    description:
      'Siempre responde `200` para no revelar si el email existe. En `development` incluye `reset_token`; en otros entornos es `null`.',
  })
  @ApiOkResponse({
    description: 'Mensaje genérico (y token de reseteo en desarrollo).',
    type: ForgotPasswordResponseDto,
  })
  @ApiUnprocessableEntityResponse({
    description: "Body inválido (`Campo '<campo>': <mensaje>`).",
  })
  forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<ForgotPasswordResponseDto> {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'resetPassword',
    summary: 'Restablecer contraseña',
    description:
      'Confirma el reseteo con un token emitido por `forgot-password` (`purpose = reset`, 15 minutos). Un access token no es válido acá.',
  })
  @ApiOkResponse({
    description: 'Contraseña restablecida.',
    type: MessageResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Token inválido o expirado.',
  })
  @ApiUnprocessableEntityResponse({
    description: "Body inválido (`Campo '<campo>': <mensaje>`).",
  })
  resetPassword(@Body() dto: ResetPasswordDto): Promise<MessageResponseDto> {
    return this.authService.resetPassword(dto);
  }
}
