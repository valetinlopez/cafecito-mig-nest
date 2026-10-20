import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service.js';
import type { HealthStatus } from './health.service.js';

@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  check(): HealthStatus {
    return this.healthService.getStatus();
  }
}
