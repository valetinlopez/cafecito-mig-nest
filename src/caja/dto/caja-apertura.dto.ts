import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class CajaAperturaDto {
  @ApiProperty({ example: 1000.0, type: Number })
  @IsNumber()
  monto_inicial!: number;
}
