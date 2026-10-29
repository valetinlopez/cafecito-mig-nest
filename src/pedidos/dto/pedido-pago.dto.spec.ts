import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { METODOS_PAGO } from '../../pagos/metodo-pago.js';
import { PedidoPagoDto } from './pedido-pago.dto.js';

async function validatePayload(payload: unknown) {
  const dto = plainToInstance(PedidoPagoDto, payload);

  return validate(dto, { whitelist: true });
}

describe('PedidoPagoDto', () => {
  it.each(METODOS_PAGO)('acepta el método de pago %s', async (metodo) => {
    const errors = await validatePayload({ metodo_pago: metodo });

    expect(errors).toEqual([]);
  });

  it('rechaza un método de pago fuera del contrato', async () => {
    const errors = await validatePayload({ metodo_pago: 'bitcoin' });

    expect(errors[0]?.property).toBe('metodo_pago');
    expect(Object.keys(errors[0]?.constraints ?? {})).toContain('isIn');
  });

  it('no acepta un monto enviado por el cliente', async () => {
    const dto = plainToInstance(PedidoPagoDto, {
      metodo_pago: 'efectivo',
      monto: 100,
    });

    const errors = await validate(dto, { whitelist: true });

    expect(errors).toEqual([]);
    expect(dto).not.toHaveProperty('monto');
  });

  it('rechaza un request sin método de pago', async () => {
    const errors = await validatePayload({});

    expect(errors[0]?.property).toBe('metodo_pago');
  });
});
