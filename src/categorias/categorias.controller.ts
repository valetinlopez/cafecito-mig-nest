import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CategoriasService } from './categorias.service.js';
import { CategoriaResponseDto } from './dto/categoria-response.dto.js';

/**
 * `GET /api/v1/categorias/` — solo lectura (MIG-18).
 *
 * Contrato: requiere JWT de cualquier rol (`auth`), ver `docs/api-contract.md` §4.
 */
@ApiTags('Categorías')
@ApiBearerAuth()
@Controller('categorias')
@UseGuards(JwtAuthGuard)
export class CategoriasController {
  constructor(private readonly categoriasService: CategoriasService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'listCategorias',
    summary: 'Listar categorías',
    description:
      'Devuelve todas las categorías ordenadas alfabéticamente por nombre. Acepta también `/api/v1/categorias` (sin barra final), sin redirect.',
  })
  @ApiOkResponse({
    description: 'Lista de categorías ordenada por nombre.',
    type: [CategoriaResponseDto],
  })
  @ApiUnauthorizedResponse({
    description: 'Token ausente, inválido o expirado.',
  })
  async findAll(): Promise<CategoriaResponseDto[]> {
    return this.categoriasService.getAllCategorias();
  }
}
