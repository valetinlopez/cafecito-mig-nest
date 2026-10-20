import { HealthService } from './health.service.js';

describe('HealthService', () => {
  let service: HealthService;

  beforeEach(() => {
    service = new HealthService();
  });

  it('returns an ok status with the service metadata', () => {
    const status = service.getStatus();

    expect(status.status).toBe('ok');
    expect(status.service).toBe('backend-nest');
    expect(status.version).toBeDefined();
    expect(status.timestamp).not.toBe('');
    expect(status.uptime).toBeGreaterThanOrEqual(0);
  });
});
