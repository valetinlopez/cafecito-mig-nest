import { NotImplementedException } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { createServiceTestModule } from '../../test/utils/test-module.helper.js';
import { PagosService } from './pagos.service.js';
import type { RegistrarPagoInput } from './pagos.service.js';

const PAGO_INPUT: RegistrarPagoInput = {
  pedidoId: 12,
  cajaId: 3,
  usuarioId: 2,
  monto: 950,
  metodoPago: 'efectivo',
};

/**
 * Verifica que una operación del esqueleto falle con `501` y nombre el ticket
 * que la implementa. Centralizarlo evita repetir los casts en cada caso.
 */
async function expectNotImplemented(
  promise: Promise<unknown>,
  operation: string,
): Promise<void> {
  const error: unknown = await promise.then(
    () => null,
    (thrown: unknown) => thrown,
  );

  expect(error).toBeInstanceOf(NotImplementedException);
  if (!(error instanceof NotImplementedException)) {
    throw new Error(`Se esperaba NotImplementedException en ${operation}`);
  }
  expect(error.getStatus()).toBe(501);
  expect(error.message).toContain(operation);
  expect(error.message).toContain('MIG-32');
}

describe('PagosService', () => {
  let module: TestingModule;
  let service: PagosService;

  beforeEach(async () => {
    ({ module, service } = await createServiceTestModule(PagosService));
  });

  afterEach(async () => {
    await module.close();
  });

  it('expone las firmas del cobro aunque todavía no estén implementadas', () => {
    expect(typeof service.registrarPago).toBe('function');
    expect(typeof service.findByCaja).toBe('function');
    expect(typeof service.findByPedido).toBe('function');
  });

  it('registrarPago falla explícito con 501 hasta MIG-32', async () => {
    await expectNotImplemented(
      service.registrarPago(PAGO_INPUT),
      'registrarPago',
    );
  });

  it('findByCaja falla explícito con 501 hasta MIG-32', async () => {
    await expectNotImplemented(service.findByCaja(3), 'findByCaja');
  });

  it('findByPedido falla explícito con 501 hasta MIG-32', async () => {
    await expectNotImplemented(service.findByPedido(12), 'findByPedido');
  });
});
