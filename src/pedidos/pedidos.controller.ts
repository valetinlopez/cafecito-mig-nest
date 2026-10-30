import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from '../common/auth/authenticated-user.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { CreatePedidoDto } from './dto/create-pedido.dto.js';
import { PedidoPagoDto } from './dto/pedido-pago.dto.js';
import { PedidoResponseDto } from './dto/pedido-response.dto.js';
import { UpdatePedidoDto } from './dto/update-pedido.dto.js';
import { PedidosService } from './pedidos.service.js';

@ApiTags('Pedidos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pedidos')
export class PedidosController {
  constructor(private readonly pedidosService: PedidosService) {}

  @Get(['', '/'])
  @ApiOperation({
    operationId: 'listPedidos',
    summary: 'Listar pedidos activos',
    description: 'Excluye pedidos pagados y cancelados; ordena por fecha DESC.',
  })
  @ApiOkResponse({ type: PedidoResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Token ausente o inválido.' })
  findAll(): Promise<PedidoResponseDto[]> {
    return this.pedidosService.findAll();
  }

  @Get(':id')
  @ApiOperation({ operationId: 'getPedido', summary: 'Obtener pedido por ID' })
  @ApiOkResponse({ type: PedidoResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token ausente o inválido.' })
  @ApiNotFoundResponse({ description: 'Pedido no encontrado.' })
  findById(@Param('id', ParseIntPipe) id: number): Promise<PedidoResponseDto> {
    return this.pedidosService.findById(id);
  }

  @Post(['', '/'])
  @ApiOperation({ operationId: 'createPedido', summary: 'Crear pedido' })
  @ApiCreatedResponse({ type: PedidoResponseDto })
  @ApiBadRequestResponse({ description: 'Mesa, producto o stock inválido.' })
  @ApiUnauthorizedResponse({ description: 'Token ausente o inválido.' })
  @ApiUnprocessableEntityResponse({ description: 'Request inválido.' })
  create(
    @CurrentUser() usuario: AuthenticatedUser,
    @Body() input: CreatePedidoDto,
  ): Promise<PedidoResponseDto> {
    return this.pedidosService.createPedido(input, usuario.id);
  }

  @Patch(':id')
  @ApiOperation({ operationId: 'updatePedido', summary: 'Cambiar estado' })
  @ApiOkResponse({ type: PedidoResponseDto })
  @ApiBadRequestResponse({ description: 'Transición no permitida.' })
  @ApiUnauthorizedResponse({ description: 'Token ausente o inválido.' })
  @ApiNotFoundResponse({ description: 'Pedido no encontrado.' })
  @ApiUnprocessableEntityResponse({ description: 'Estado inválido.' })
  updatePedidoEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() input: UpdatePedidoDto,
  ): Promise<PedidoResponseDto> {
    return this.pedidosService.updatePedidoEstado(id, input);
  }

  @Post(':id/pago')
  @HttpCode(HttpStatus.OK)
  @Roles('admin')
  @ApiOperation({
    operationId: 'cobrarPedido',
    summary: 'Cobrar pedido (admin)',
  })
  @ApiOkResponse({ type: PedidoResponseDto })
  @ApiBadRequestResponse({ description: 'Estado inválido o caja cerrada.' })
  @ApiUnauthorizedResponse({ description: 'Token ausente o inválido.' })
  @ApiForbiddenResponse({ description: 'Se requiere rol de administrador.' })
  @ApiNotFoundResponse({ description: 'Pedido no encontrado.' })
  @ApiUnprocessableEntityResponse({ description: 'Método de pago inválido.' })
  cobrarPedido(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() usuario: AuthenticatedUser,
    @Body() input: PedidoPagoDto,
  ): Promise<PedidoResponseDto> {
    return this.pedidosService.cobrarPedido(id, input, usuario.id);
  }
}
