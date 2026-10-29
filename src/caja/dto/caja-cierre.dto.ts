import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class CajaCierreDto {
  @ApiProperty({ example: 3500.0, type: Number })
  @IsNumber()
  monto_final!: number;
}
