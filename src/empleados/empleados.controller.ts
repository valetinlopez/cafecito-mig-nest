import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from '../common/auth/authenticated-user.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { UsuarioResponseDto } from '../users/dto/usuario-response.dto.js';
import { CreateEmpleadoDto } from './dto/create-empleado.dto.js';
import { UpdateEmpleadoDto } from './dto/update-empleado.dto.js';
import { EmpleadosService } from './empleados.service.js';

@ApiTags('Empleados')
@ApiBearerAuth()
@Controller('empleados')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class EmpleadosController {
  constructor(private readonly empleadosService: EmpleadosService) {}

  @Get()
  @ApiOperation({
    operationId: 'listEmpleados',
    summary: 'Listar usuarios (admin)',
  })
  @ApiOkResponse({ type: [UsuarioResponseDto] })
  @ApiUnauthorizedResponse({ description: 'Token ausente, inválido o expirado.' })
  @ApiForbiddenResponse({ description: 'Se requiere rol de administrador.' })
  getAll(): Promise<UsuarioResponseDto[]> {
    return this.empleadosService.getAllEmpleados();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ operationId: 'createEmpleado', summary: 'Crear empleado' })
  @ApiCreatedResponse({ type: UsuarioResponseDto })
  @ApiBadRequestResponse({ description: 'El email ya está registrado.' })
  @ApiUnauthorizedResponse({ description: 'Token ausente, inválido o expirado.' })
  @ApiForbiddenResponse({ description: 'Se requiere rol de administrador.' })
  @ApiUnprocessableEntityResponse({ description: 'Body inválido.' })
  create(@Body() dto: CreateEmpleadoDto): Promise<UsuarioResponseDto> {
    return this.empleadosService.createEmpleado(dto);
  }

  @Patch(':id')
  @ApiOperation({ operationId: 'updateEmpleado', summary: 'Actualizar empleado' })
  @ApiOkResponse({ type: UsuarioResponseDto })
  @ApiBadRequestResponse({ description: 'Email duplicado o auto-desactivación.' })
  @ApiNotFoundResponse({ description: 'Empleado no encontrado.' })
  @ApiUnauthorizedResponse({ description: 'Token ausente, inválido o expirado.' })
  @ApiForbiddenResponse({ description: 'Se requiere rol de administrador.' })
  @ApiUnprocessableEntityResponse({ description: 'Body o id inválido.' })
  update(
    @Param(
      'id',
      new ParseIntPipe({
        exceptionFactory: () =>
          new UnprocessableEntityException("Campo 'id': debe ser un número entero"),
      }),
    )
    id: number,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: UpdateEmpleadoDto,
  ): Promise<UsuarioResponseDto> {
    return this.empleadosService.updateEmpleado(id, currentUser.id, dto);
  }
}