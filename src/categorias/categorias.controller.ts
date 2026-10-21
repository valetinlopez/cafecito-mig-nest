import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CategoriasService } from './categorias.service.js';
import { CategoriaResponseDto } from './dto/categoria-response.dto.js';

/**
 * `GET /api/v1/categorias/` — solo lectura (MIG-18).
 *
 * Contrato: requiere JWT de cualquier rol (`auth`), ver `docs/api-contract.md` §4.
 * El guard se agrega en MIG-24 (`JwtAuthGuard`): hoy no existe la infraestructura
 * de autenticación en el scaffold, por eso el endpoint todavía no está protegido.
 */
@ApiTags('Categorías')
@ApiBearerAuth()
@Controller('categorias')
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
