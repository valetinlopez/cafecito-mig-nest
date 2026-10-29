import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Res,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { Roles } from '../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { CajaAperturaDto } from './dto/caja-apertura.dto.js';
import { CajaCierreDto } from './dto/caja-cierre.dto.js';
import { CajaResponseDto } from './dto/caja-response.dto.js';
import { MovimientoCajaResponseDto } from './dto/movimiento-caja-response.dto.js';
import { CajaService } from './caja.service.js';

@ApiTags('Caja')
@ApiBearerAuth()
@Controller('caja')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class CajaController {
  constructor(private readonly cajaService: CajaService) {}

  @Get()
  @ApiOperation({
    operationId: 'getCajaAbierta',
    summary: 'Consultar caja abierta',
  })
  @ApiOkResponse({
    type: CajaResponseDto,
    description: 'Caja abierta o literal JSON null si no hay caja.',
  })
  @ApiUnauthorizedResponse({
    description: 'Token ausente, inválido o expirado.',
  })
  @ApiForbiddenResponse({ description: 'Se requiere rol de administrador.' })
  async getCajaAbierta(@Res() response: Response): Promise<void> {
    const caja = await this.cajaService.getCajaAbierta();
    response.status(HttpStatus.OK).json(caja);
  }

  @Get('historial')
  @ApiOperation({
    operationId: 'getHistorialCaja',
    summary: 'Listar historial de cajas',
  })
  @ApiOkResponse({ type: [CajaResponseDto] })
  @ApiUnauthorizedResponse({
    description: 'Token ausente, inválido o expirado.',
  })
  @ApiForbiddenResponse({ description: 'Se requiere rol de administrador.' })
  getHistorial(): Promise<CajaResponseDto[]> {
    return this.cajaService.getTodasLasCajas();
  }

  @Get(':id/movimientos')
  @ApiOperation({
    operationId: 'getMovimientosCaja',
    summary: 'Listar movimientos de una caja',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: [MovimientoCajaResponseDto] })
  @ApiNotFoundResponse({ description: 'Caja no encontrada.' })
  @ApiUnauthorizedResponse({
    description: 'Token ausente, inválido o expirado.',
  })
  @ApiForbiddenResponse({ description: 'Se requiere rol de administrador.' })
  @ApiUnprocessableEntityResponse({ description: 'El id debe ser un entero.' })
  getMovimientos(
    @Param(
      'id',
      new ParseIntPipe({
        exceptionFactory: () =>
          new UnprocessableEntityException(
            "Campo 'id': debe ser un número entero",
          ),
      }),
    )
    id: number,
  ): Promise<MovimientoCajaResponseDto[]> {
    return this.cajaService.getMovimientosCaja(id);
  }

  @Post('apertura')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ operationId: 'abrirCaja', summary: 'Abrir una caja' })
  @ApiBody({ type: CajaAperturaDto })
  @ApiCreatedResponse({ type: CajaResponseDto })
  @ApiBadRequestResponse({ description: 'Ya hay una caja abierta.' })
  @ApiUnauthorizedResponse({
    description: 'Token ausente, inválido o expirado.',
  })
  @ApiForbiddenResponse({ description: 'Se requiere rol de administrador.' })
  @ApiUnprocessableEntityResponse({ description: 'Body inválido.' })
  abrir(@Body() dto: CajaAperturaDto): Promise<CajaResponseDto> {
    return this.cajaService.abrirCaja(dto);
  }

  @Post('cierre')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'cerrarCaja', summary: 'Cerrar caja abierta' })
  @ApiBody({ type: CajaCierreDto })
  @ApiOkResponse({ type: CajaResponseDto })
  @ApiBadRequestResponse({ description: 'No hay una caja abierta.' })
  @ApiUnauthorizedResponse({
    description: 'Token ausente, inválido o expirado.',
  })
  @ApiForbiddenResponse({ description: 'Se requiere rol de administrador.' })
  @ApiUnprocessableEntityResponse({ description: 'Body inválido.' })
  cerrar(@Body() dto: CajaCierreDto): Promise<CajaResponseDto> {
    return this.cajaService.cerrarCaja(dto);
  }
}
