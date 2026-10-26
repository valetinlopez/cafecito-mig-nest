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
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CreateMesaDto } from './dto/create-mesa.dto.js';
import { MesaResponseDto } from './dto/mesa-response.dto.js';
import { UpdateMesaDto } from './dto/update-mesa.dto.js';
import { MesasService } from './mesas.service.js';

@ApiTags('Mesas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('mesas')
export class MesasController {
  constructor(private readonly mesasService: MesasService) {}

  @Get(['', '/'])
  @ApiOperation({
    operationId: 'listMesas',
    summary: 'Listar mesas ordenadas por número',
    description:
      'Devuelve mesas ordenadas por número. Acepta paths con y sin barra final.',
  })
  @ApiOkResponse({ type: MesaResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Token ausente o inválido.' })
  async findAll(): Promise<MesaResponseDto[]> {
    const mesas = await this.mesasService.findAll();
    return mesas.map((mesa) => MesaResponseDto.fromEntity(mesa));
  }

  @Get(':id')
  @ApiOperation({ operationId: 'getMesa', summary: 'Obtener mesa por ID' })
  @ApiOkResponse({ type: MesaResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token ausente o inválido.' })
  @ApiNotFoundResponse({ description: 'Mesa no encontrada.' })
  @ApiInternalServerErrorResponse({ description: 'Error interno.' })
  async findById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<MesaResponseDto> {
    const mesa = await this.mesasService.findById(id);
    return MesaResponseDto.fromEntity(mesa);
  }

  @Post(['', '/'])
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ operationId: 'createMesa', summary: 'Crear mesa (admin)' })
  @ApiCreatedResponse({ type: MesaResponseDto })
  @ApiBadRequestResponse({ description: 'Ya existe una mesa con ese número.' })
  @ApiUnauthorizedResponse({ description: 'Token ausente o inválido.' })
  @ApiForbiddenResponse({ description: 'Se requiere rol de administrador.' })
  @ApiUnprocessableEntityResponse({ description: 'Número inválido.' })
  @ApiInternalServerErrorResponse({ description: 'Error interno.' })
  async create(@Body() input: CreateMesaDto): Promise<MesaResponseDto> {
    const mesa = await this.mesasService.create(input);
    return MesaResponseDto.fromEntity(mesa);
  }

  @Patch(':id')
  @ApiOperation({
    operationId: 'updateMesa',
    summary: 'Cambiar estado de mesa',
  })
  @ApiOkResponse({ type: MesaResponseDto })
  @ApiBadRequestResponse({
    description: 'Transición no permitida o pedido activo.',
  })
  @ApiUnauthorizedResponse({ description: 'Token ausente o inválido.' })
  @ApiNotFoundResponse({ description: 'Mesa no encontrada.' })
  @ApiUnprocessableEntityResponse({ description: 'Estado inválido.' })
  @ApiInternalServerErrorResponse({
    description: 'No se pudo consultar el port de pedidos.',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() input: UpdateMesaDto,
  ): Promise<MesaResponseDto> {
    const mesa = await this.mesasService.update(id, input);
    return MesaResponseDto.fromEntity(mesa);
  }
}
