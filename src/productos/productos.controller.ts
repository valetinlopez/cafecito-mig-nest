import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { CreateProductoDto } from './dto/create-producto.dto.js';
import { ProductoResponseDto } from './dto/producto-response.dto.js';
import { UpdateProductoDto } from './dto/update-producto.dto.js';
import { ProductosService } from './productos.service.js';

@ApiTags('Productos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('productos')
export class ProductosController {
  constructor(private readonly productosService: ProductosService) {}

  @Get(['', '/'])
  @ApiOperation({
    operationId: 'listProductos',
    summary: 'Listar productos ordenados por nombre',
  })
  @ApiOkResponse({ type: ProductoResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Token ausente o inválido.' })
  async findAll(): Promise<ProductoResponseDto[]> {
    const productos = await this.productosService.findAll();
    return productos.map((producto) => ProductoResponseDto.fromEntity(producto));
  }

  @Get(':id')
  @ApiOperation({
    operationId: 'getProducto',
    summary: 'Obtener producto por ID',
  })
  @ApiOkResponse({ type: ProductoResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token ausente o inválido.' })
  @ApiNotFoundResponse({ description: 'Producto no encontrado.' })
  async findById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ProductoResponseDto> {
    return ProductoResponseDto.fromEntity(
      await this.productosService.findById(id),
    );
  }

  @Post(['', '/'])
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({
    operationId: 'createProducto',
    summary: 'Crear producto (admin)',
  })
  @ApiCreatedResponse({ type: ProductoResponseDto })
  @ApiBadRequestResponse({ description: 'La categoría indicada no existe.' })
  @ApiUnauthorizedResponse({ description: 'Token ausente o inválido.' })
  @ApiForbiddenResponse({ description: 'Se requiere rol de administrador.' })
  @ApiUnprocessableEntityResponse({ description: 'Datos del producto inválidos.' })
  @ApiInternalServerErrorResponse({ description: 'Error interno.' })
  async create(@Body() input: CreateProductoDto): Promise<ProductoResponseDto> {
    return ProductoResponseDto.fromEntity(
      await this.productosService.create(input),
    );
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({
    operationId: 'updateProducto',
    summary: 'Actualizar producto (admin)',
  })
  @ApiOkResponse({ type: ProductoResponseDto })
  @ApiBadRequestResponse({ description: 'La categoría indicada no existe.' })
  @ApiUnauthorizedResponse({ description: 'Token ausente o inválido.' })
  @ApiForbiddenResponse({ description: 'Se requiere rol de administrador.' })
  @ApiNotFoundResponse({ description: 'Producto no encontrado.' })
  @ApiUnprocessableEntityResponse({ description: 'Datos del producto inválidos.' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() input: UpdateProductoDto,
  ): Promise<ProductoResponseDto> {
    return ProductoResponseDto.fromEntity(
      await this.productosService.update(id, input),
    );
  }
}