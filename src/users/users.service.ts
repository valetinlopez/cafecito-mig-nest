import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from './entities/usuario.entity.js';
import type { Rol } from './rol.js';

/** Datos mínimos para crear un usuario (el hash lo calcula quien llama). */
export interface CreateUsuarioData {
  nombre: string;
  email: string;
  passwordHash: string;
  rol: Rol;
}

/** Campos editables de un usuario. `undefined` significa "no lo toques". */
export interface UpdateUsuarioData {
  nombre?: string;
  email?: string;
  passwordHash?: string;
  activo?: boolean;
}

/**
 * Normaliza el email antes de compararlo o guardarlo (D-04 de `users`).
 *
 * PostgreSQL compara `varchar` distinguiendo mayúsculas: sin esto
 * `Admin@x.com` y `admin@x.com` conviven y el login falla de forma
 * intermitente.
 */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Único punto de acceso a la tabla `usuarios` (MIG-25).
 *
 * `auth` y `empleados` consumen este service, nunca `@InjectRepository`
 * (D-01/D-02 de `users`). Devuelve entities: el mapeo al shape HTTP lo hace el
 * módulo que expone el endpoint, con su propio DTO `fromEntity()`.
 */
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
  ) {}

  async findByEmail(email: string): Promise<Usuario | null> {
    return this.usuariosRepository.findOne({
      where: { email: normalizeEmail(email) },
    });
  }

  async findById(id: number): Promise<Usuario | null> {
    return this.usuariosRepository.findOne({ where: { id } });
  }

  async findAll(): Promise<Usuario[]> {
    return this.usuariosRepository.find({ order: { nombre: 'ASC' } });
  }

  /**
   * Indica si el email ya pertenece a otro usuario.
   *
   * `excludeId` permite validar un cambio de perfil sin chocar con el propio
   * registro (`PATCH /auth/me`, `400 El email ya está en uso por otro usuario`).
   */
  async existsByEmail(email: string, excludeId?: number): Promise<boolean> {
    const usuario = await this.findByEmail(email);

    return usuario !== null && usuario.id !== excludeId;
  }

  async create(data: CreateUsuarioData): Promise<Usuario> {
    const usuario = this.usuariosRepository.create({
      nombre: data.nombre,
      email: normalizeEmail(data.email),
      passwordHash: data.passwordHash,
      rol: data.rol,
    });

    return this.usuariosRepository.save(usuario);
  }

  /**
   * Actualiza solo los campos presentes y devuelve la entity resultante.
   *
   * Devuelve `null` si el usuario no existe: el módulo consumidor decide el
   * código HTTP (`401` en auth, `404` en empleados).
   */
  async update(id: number, data: UpdateUsuarioData): Promise<Usuario | null> {
    const usuario = await this.findById(id);

    if (usuario === null) {
      return null;
    }

    if (data.nombre !== undefined) {
      usuario.nombre = data.nombre;
    }

    if (data.email !== undefined) {
      usuario.email = normalizeEmail(data.email);
    }

    if (data.passwordHash !== undefined) {
      usuario.passwordHash = data.passwordHash;
    }

    if (data.activo !== undefined) {
      usuario.activo = data.activo;
    }

    return this.usuariosRepository.save(usuario);
  }
}
