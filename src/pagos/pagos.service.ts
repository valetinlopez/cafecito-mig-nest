import { Injectable, NotImplementedException } from '@nestjs/common';
import type { PagoResponseDto } from './dto/pago-response.dto.js';
import type { MetodoPago } from './metodo-pago.js';

/**
 * Datos que el cobro (`PedidosService`) entrega para registrar un pago.
 *
 * `monto` lo calcula el servidor a partir de `pedido.total` (D-03): no se
 * acepta un monto del cliente. `cajaId` y `usuarioId` los resuelve el servicio
 * del cobro; el request HTTP solo envía `metodo_pago`.
 */
export interface RegistrarPagoInput {
  pedidoId: number;
  cajaId: number;
  usuarioId: number;
  monto: number;
  metodoPago: MetodoPago;
}

const PENDING_OPERATION_MESSAGE = 'Pagos: operación pendiente de implementación';

/**
 * Acceso a datos de `pagos` (MIG-31).
 *
 * Es un módulo de soporte: no tiene controller ni endpoints propios. El cobro
 * se dispara desde `POST /api/v1/pedidos/{id}/pago` y los movimientos se leen
 * desde `GET /api/v1/caja/{id}/movimientos`.
 *
 * **Estado: esqueleto.** Este ticket entrega la entity y los DTOs; la lógica
 * del cobro (transacción y resolución de la caja abierta) llega en MIG-33 y el
 * mapeo de movimientos en MIG-32. Las firmas se congelan acá para que `pedidos`
 * y `caja` programen contra ellas, y toda llamada falla explícito con `501` en
 * lugar de devolver datos vacíos que ocultarían el pendiente.
 *
 * No inyecta repositorios todavía: agregarlos sin quien los consuma rompería
 * `noUnusedLocals` y no aporta al alcance. `PagosModule` ya registra la entity
 * con `TypeOrmModule.forFeature([Pago])`, así que MIG-33 solo inyecta lo
 * necesario para operar con el `EntityManager` del cobro.
 */
@Injectable()
export class PagosService {
  /**
   * Registra el pago de un pedido dentro de la transacción del cobro.
   *
   * Implementación pendiente: MIG-33 (junto con el cambio a `pagado`, la
   * liberación de la mesa y el cierre contable en la caja).
   */
  registrarPago(_input: RegistrarPagoInput): Promise<PagoResponseDto> {
    return Promise.reject(this.pendingOperation('registrarPago', 'MIG-33'));
  }

  /**
   * Devuelve los pagos de una caja, del más antiguo al más reciente.
   *
   * Implementación pendiente: MIG-32 (`GET /caja/{id}/movimientos`).
   */
  findByCaja(_cajaId: number): Promise<PagoResponseDto[]> {
    return Promise.reject(this.pendingOperation('findByCaja', 'MIG-32'));
  }

  /**
   * Devuelve el pago de un pedido, o `null` si todavía no se cobró.
   *
   * Implementación pendiente: MIG-33 (verificación previa al cobro).
   */
  findByPedido(_pedidoId: number): Promise<PagoResponseDto | null> {
    return Promise.reject(this.pendingOperation('findByPedido', 'MIG-33'));
  }

  private pendingOperation(
    operation: string,
    ticket: string,
  ): NotImplementedException {
    return new NotImplementedException(
      `${PENDING_OPERATION_MESSAGE} (${ticket}): ${operation}`,
    );
  }
}
