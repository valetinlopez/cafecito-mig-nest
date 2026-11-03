import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsDefined, Matches } from 'class-validator';

/** Formato contractual del contrato: fecha sin hora ni zona. */
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Query de `GET /api/v1/reportes/ventas` (`ReportePeriodo` del contrato).
 *
 * Los dos parámetros son obligatorios y se interpretan como fechas del
 * calendario del negocio, inclusivas en ambos extremos (D-01 de
 * `DECISIONS.md`). El formato inválido se rechaza con `422` antes de tocar la
 * base; el orden `desde > hasta` se valida en el service porque es una regla de
 * negocio (`400`).
 *
 * El orden de los decoradores importa: `@IsDefined` va último para que un
 * parámetro ausente responda `es obligatorio` en lugar de un error de formato.
 */
export class ReporteVentasQueryDto {
  @ApiProperty({
    type: String,
    format: 'date',
    example: '2026-10-01',
    description: 'Fecha inicial inclusive, formato YYYY-MM-DD.',
  })
  @IsDateString({ strict: true }, { message: 'debe ser una fecha válida' })
  @Matches(ISO_DATE_PATTERN, {
    message: 'debe tener el formato YYYY-MM-DD',
  })
  @IsDefined({ message: 'es obligatorio' })
  desde!: string;

  @ApiProperty({
    type: String,
    format: 'date',
    example: '2026-10-19',
    description: 'Fecha final inclusive, formato YYYY-MM-DD.',
  })
  @IsDateString({ strict: true }, { message: 'debe ser una fecha válida' })
  @Matches(ISO_DATE_PATTERN, {
    message: 'debe tener el formato YYYY-MM-DD',
  })
  @IsDefined({ message: 'es obligatorio' })
  hasta!: string;
}
