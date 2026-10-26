import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateProductoDto {
  @ApiProperty({ example: 'Café con leche', minLength: 1 })
  @IsString()
  @MinLength(1)
  nombre!: string;

  @ApiPropertyOptional({ example: 'Café espresso con leche vaporizada', nullable: true })
  @IsOptional()
  @IsString()
  descripcion?: string | null;

  @ApiProperty({ example: 850.0, minimum: 0.01 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  precio!: number;

  @ApiPropertyOptional({ example: 0, default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({ example: 5, default: 5, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock_minimo?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  disponible?: boolean;

  @ApiProperty({ example: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoria_id!: number;
}