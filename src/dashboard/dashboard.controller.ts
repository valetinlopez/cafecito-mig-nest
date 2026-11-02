import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { DashboardResumenResponseDto } from './dto/dashboard-resumen-response.dto.js';
import { DashboardService } from './dashboard.service.js';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('resumen')
  @ApiOperation({
    operationId: 'getDashboardResumen',
    summary: 'Consultar resumen de KPIs del dashboard',
  })
  @ApiOkResponse({ type: DashboardResumenResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token ausente, inválido o expirado.' })
  @ApiForbiddenResponse({ description: 'Se requiere rol de administrador.' })
  getDashboardResumen(): Promise<DashboardResumenResponseDto> {
    return this.dashboardService.getDashboardResumen();
  }
}