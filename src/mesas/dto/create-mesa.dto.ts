import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class CreateMesaDto {
  @ApiProperty({
    description: 'Número visible de la mesa',
    example: 13,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  numero!: number;
}
