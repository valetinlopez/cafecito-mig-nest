import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { ACTIVE_ORDERS_PORT } from './active-orders.port.js';
import type { ActiveOrdersPort } from './active-orders.port.js';
import type { CreateMesaDto } from './dto/create-mesa.dto.js';
import type { UpdateMesaDto } from './dto/update-mesa.dto.js';
import { Mesa } from './entities/mesa.entity.js';
import { MESA_ESTADOS } from './mesa-estado.js';
import type { MesaEstado } from './mesa-estado.js';

/** Único mapa de transiciones que pueden solicitarse manualmente. */
export const TRANSICIONES_MESA: Readonly<
  Record<MesaEstado, readonly MesaEstado[]>
> = {
  libre: ['ocupada', 'reservada'],
  ocupada: ['en_limpieza'],
  reservada: ['ocupada', 'libre'],
  pendiente_cobro: ['ocupada'],
  en_limpieza: ['libre'],
};

const UNIQUE_MESA_NUMBER = 'mesas_numero_key';

@Injectable()
export class MesasService {
  constructor(
    @InjectRepository(Mesa)
    private readonly repository: Repository<Mesa>,
    @Inject(ACTIVE_ORDERS_PORT)
    private readonly activeOrders: ActiveOrdersPort,
  ) {}

  async findAll(): Promise<Mesa[]> {
    return this.repository.find({ order: { numero: 'ASC' } });
  }

  async findById(id: number): Promise<Mesa> {
    const mesa = await this.repository.findOneBy({ id });
    if (mesa === null) {
      throw new NotFoundException('Mesa no encontrada');
    }
    return mesa;
  }

  async create(input: CreateMesaDto): Promise<Mesa> {
    const mesa = this.repository.create({
      numero: input.numero,
      estado: 'libre',
    });

    try {
      return await this.repository.save(mesa);
    } catch (error) {
      if (isUniqueMesaNumberViolation(error)) {
        throw new BadRequestException(
          `Ya existe una mesa con el número ${input.numero}`,
        );
      }
      throw error;
    }
  }

  async update(id: number, input: UpdateMesaDto): Promise<Mesa> {
    const mesa = await this.findById(id);
    const nextState = input.estado;

    if (!MESA_ESTADOS.includes(nextState)) {
      throw new BadRequestException(`Estado de mesa inválido: '${nextState}'`);
    }

    if (!TRANSICIONES_MESA[mesa.estado].includes(nextState)) {
      throw new BadRequestException(
        `No se puede cambiar el estado de '${mesa.estado}' a '${nextState}'`,
      );
    }

    if (mesa.estado === 'ocupada' && nextState === 'en_limpieza') {
      let hasActiveOrder: boolean;
      try {
        hasActiveOrder =
          await this.activeOrders.hasUnpaidActiveOrderForTable(id);
      } catch {
        throw new InternalServerErrorException(
          'No se pudo verificar si la mesa tiene pedidos activos',
        );
      }

      if (hasActiveOrder) {
        throw new BadRequestException(
          'No se puede pasar la mesa a limpieza: tiene un pedido activo sin cobrar',
        );
      }
    }

    mesa.estado = nextState;
    return this.repository.save(mesa);
  }
}

function isUniqueMesaNumberViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }

  const driverError = error.driverError as {
    code?: unknown;
    constraint?: unknown;
  };
  return (
    driverError.code === '23505' &&
    driverError.constraint === UNIQUE_MESA_NUMBER
  );
}
