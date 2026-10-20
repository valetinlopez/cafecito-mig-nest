import { Injectable } from '@nestjs/common';

export interface HealthStatus {
  status: 'ok';
  service: string;
  version: string;
  timestamp: string;
  uptime: number;
}

const SERVICE_NAME = 'backend-nest';
const SERVICE_VERSION = process.env.npm_package_version ?? '0.0.1';

@Injectable()
export class HealthService {
  getStatus(): HealthStatus {
    return {
      status: 'ok',
      service: SERVICE_NAME,
      version: SERVICE_VERSION,
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
    };
  }
}
