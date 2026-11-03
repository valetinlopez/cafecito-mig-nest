import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { ReporteVentasQueryDto } from './dto/reporte-ventas-query.dto.js';
import { ReporteVentasResponseDto } from './dto/reporte-ventas-response.dto.js';
import { ReportesService } from './reportes.service.js';

@ApiTags('Reportes')
@ApiBearerAuth()
@Controller('reportes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Get('ventas')
  @ApiOperation({
    operationId: 'getReporteVentas',
    summary: 'Consultar el reporte de ventas por rango de fechas',
  })
  @ApiQuery({
    name: 'desde',
    required: true,
    type: String,
    example: '2026-10-01',
    description: 'Fecha inicial inclusive, formato YYYY-MM-DD.',
  })
  @ApiQuery({
    name: 'hasta',
    required: true,
    type: String,
    example: '2026-10-19',
    description: 'Fecha final inclusive, formato YYYY-MM-DD.',
  })
  @ApiOkResponse({ type: ReporteVentasResponseDto })
  @ApiBadRequestResponse({
    description: "La fecha 'desde' no puede ser posterior a 'hasta'.",
  })
  @ApiUnauthorizedResponse({
    description: 'Token ausente, inválido o expirado.',
  })
  @ApiForbiddenResponse({ description: 'Se requiere rol de administrador.' })
  @ApiUnprocessableEntityResponse({
    description: 'Parámetros faltantes o con formato de fecha inválido.',
  })
  getReporteVentas(
    @Query() query: ReporteVentasQueryDto,
  ): Promise<ReporteVentasResponseDto> {
    return this.reportesService.getReporteVentas(query);
  }
}
