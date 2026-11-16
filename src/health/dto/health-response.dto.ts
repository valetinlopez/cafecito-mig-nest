import { ApiProperty } from '@nestjs/swagger';

/**
 * Contrato documental del health check (contrato §6.10, D-14).
 *
 * Es una clase de solo documentación: el controller sigue devolviendo
 * `HealthStatus` para no acoplar el service a Swagger.
 */
export class HealthResponseDto {
  @ApiProperty({ enum: ['ok'], example: 'ok' })
  status!: 'ok';

  @ApiProperty({ example: 'backend-nest' })
  service!: string;

  @ApiProperty({ example: '0.0.1' })
  version!: string;

  @ApiProperty({
    example: '2026-10-19T23:00:00.000Z',
    description: 'ISO-8601 UTC con `Z`.',
  })
  timestamp!: string;

  @ApiProperty({
    example: 12,
    description: 'Segundos desde el arranque del proceso.',
  })
  uptime!: number;
}
