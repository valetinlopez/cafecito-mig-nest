import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import bcrypt from 'bcrypt';
import { QueryFailedError } from 'typeorm';
import type { Usuario } from '../users/entities/usuario.entity.js';
import { UsuarioResponseDto } from '../users/dto/usuario-response.dto.js';
import { UsersService } from '../users/users.service.js';
import type { CreateEmpleadoDto } from './dto/create-empleado.dto.js';
import type { UpdateEmpleadoDto } from './dto/update-empleado.dto.js';

const BCRYPT_ROUNDS = 10;
const EMAIL_ALREADY_REGISTERED_DETAIL = 'El email ya está registrado';
const EMAIL_ALREADY_IN_USE_DETAIL = 'El email ya está en uso por otro usuario';
const SELF_DEACTIVATION_DETAIL = 'No podés desactivar tu propio usuario';
const EMPLOYEE_NOT_FOUND_DETAIL = 'Empleado no encontrado';

/** Reglas administrativas de empleados (MIG-26); la persistencia pertenece a users. */
@Injectable()
export class EmpleadosService {
  constructor(private readonly usersService: UsersService) {}

  async getAllEmpleados(): Promise<UsuarioResponseDto[]> {
    const usuarios = await this.usersService.findAll();
    return usuarios.map((usuario) => UsuarioResponseDto.fromEntity(usuario));
  }

  async createEmpleado(dto: CreateEmpleadoDto): Promise<UsuarioResponseDto> {
    if (await this.usersService.existsByEmail(dto.email)) {
      throw new BadRequestException(EMAIL_ALREADY_REGISTERED_DETAIL);
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    try {
      const usuario = await this.usersService.create({
        nombre: dto.nombre,
        email: dto.email,
        passwordHash,
        rol: 'mozo',
      });

      return UsuarioResponseDto.fromEntity(usuario);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BadRequestException(EMAIL_ALREADY_REGISTERED_DETAIL);
      }
      throw error;
    }
  }

  async updateEmpleado(
    id: number,
    currentUserId: number,
    dto: UpdateEmpleadoDto,
  ): Promise<UsuarioResponseDto> {
    const existing = await this.usersService.findById(id);
    if (existing === null) {
      throw new NotFoundException(EMPLOYEE_NOT_FOUND_DETAIL);
    }

    if (dto.activo === false && id === currentUserId) {
      throw new BadRequestException(SELF_DEACTIVATION_DETAIL);
    }

    if (
      dto.email !== undefined &&
      (await this.usersService.existsByEmail(dto.email, id))
    ) {
      throw new BadRequestException(EMAIL_ALREADY_IN_USE_DETAIL);
    }

    let updated: Usuario | null;
    try {
      updated = await this.usersService.update(id, {
        nombre: dto.nombre,
        email: dto.email,
        activo: dto.activo,
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BadRequestException(EMAIL_ALREADY_IN_USE_DETAIL);
      }
      throw error;
    }

    if (updated === null) {
      throw new NotFoundException(EMPLOYEE_NOT_FOUND_DETAIL);
    }

    return UsuarioResponseDto.fromEntity(updated);
  }
}

function isUniqueViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }

  const driverError = error.driverError as { code?: string };
  return driverError.code === '23505';
}