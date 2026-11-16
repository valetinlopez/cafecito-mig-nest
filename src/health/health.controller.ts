import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthResponseDto } from './dto/health-response.dto.js';
import { HealthService } from './health.service.js';
import type { HealthStatus } from './health.service.js';

/**
 * Health check (contrato §6.10, D-14).
 *
 * Queda fuera de `/api/v1` y no consulta la base: debe responder con
 * PostgreSQL caído.
 */
@ApiTags('Health')
@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({
    operationId: 'getHealth',
    summary: 'Health check',
    description:
      'Confirma que el proceso está vivo. No consulta la base de datos.',
  })
  @ApiOkResponse({
    description: 'Servicio operativo.',
    type: HealthResponseDto,
  })
  check(): HealthStatus {
    return this.healthService.getStatus();
  }
}
