import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import type { EntityManager, Repository } from 'typeorm';
import { DataSource } from 'typeorm';
import { PagosService } from '../pagos/pagos.service.js';
import { CajaAperturaDto } from './dto/caja-apertura.dto.js';
import { CajaCierreDto } from './dto/caja-cierre.dto.js';
import { CajaResponseDto } from './dto/caja-response.dto.js';
import { MovimientoCajaResponseDto } from './dto/movimiento-caja-response.dto.js';
import { Caja } from './entities/caja.entity.js';

const OPEN_CAJA_LOCK = [1128351301, 32] as const;

@Injectable()
export class CajaService {
  constructor(
    @InjectRepository(Caja)
    private readonly cajaRepository: Repository<Caja>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly pagosService: PagosService,
  ) {}

  async getCajaAbierta(): Promise<CajaResponseDto | null> {
    const caja = await this.findAbierta();
    if (caja === null) return null;

    const totalVentas = await this.pagosService.getTotalVentas(caja.id);
    return CajaResponseDto.fromEntity(caja, totalVentas);
  }

  /** Busca la caja abierta; dentro de transacción aplica el lock de cierre. */
  async findAbierta(manager?: EntityManager): Promise<Caja | null> {
    const options = {
      where: { estado: 'abierta' as const },
      ...(manager === undefined
        ? {}
        : { lock: { mode: 'pessimistic_write' as const } }),
    };
    const cajas = manager
      ? await manager.find(Caja, options)
      : await this.cajaRepository.find(options);

    // Missing row is null; never use findOneOrFail().
    return cajas[0] ?? null;
  }

  async getTodasLasCajas(): Promise<CajaResponseDto[]> {
    const cajas = await this.cajaRepository.find({
      order: { fechaApertura: 'DESC' },
    });
    const totals = await this.pagosService.getTotalesVentas(
      cajas.map((caja) => caja.id),
    );

    return cajas.map((caja) =>
      CajaResponseDto.fromEntity(caja, totals.get(caja.id) ?? 0),
    );
  }

  async getMovimientosCaja(
    cajaId: number,
  ): Promise<MovimientoCajaResponseDto[]> {
    const caja = await this.cajaRepository.findOneBy({ id: cajaId });
    if (caja === null) throw new NotFoundException('Caja no encontrada');

    const movimientos = await this.pagosService.findByCaja(cajaId);
    return movimientos.map((movimiento) =>
      MovimientoCajaResponseDto.fromProjection(movimiento),
    );
  }

  async abrirCaja(dto: CajaAperturaDto): Promise<CajaResponseDto> {
    const caja = await this.dataSource.transaction(async (manager) => {
      await manager.query('SELECT pg_advisory_xact_lock($1, $2)', [
        ...OPEN_CAJA_LOCK,
      ]);
      if ((await this.findAbierta(manager)) !== null) {
        throw new BadRequestException('Ya hay una caja abierta');
      }

      const nuevaCaja = manager.create(Caja, {
        montoInicial: dto.monto_inicial,
        estado: 'abierta',
      });
      return manager.save(Caja, nuevaCaja);
    });

    const totalVentas = await this.pagosService.getTotalVentas(caja.id);
    return CajaResponseDto.fromEntity(caja, totalVentas);
  }

  async cerrarCaja(dto: CajaCierreDto): Promise<CajaResponseDto> {
    const caja = await this.dataSource.transaction(async (manager) => {
      const abierta = await this.findAbierta(manager);
      if (abierta === null) {
        throw new BadRequestException('No hay una caja abierta');
      }

      abierta.fechaCierre = new Date();
      abierta.montoFinal = dto.monto_final;
      abierta.estado = 'cerrada';
      return manager.save(Caja, abierta);
    });

    const totalVentas = await this.pagosService.getTotalVentas(caja.id);
    return CajaResponseDto.fromEntity(caja, totalVentas);
  }
}
