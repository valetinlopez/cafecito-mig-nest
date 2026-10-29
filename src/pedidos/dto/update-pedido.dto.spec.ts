import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PEDIDO_ESTADOS } from '../pedido-estado.js';
import { UpdatePedidoDto } from './update-pedido.dto.js';

async function validatePayload(payload: unknown) {
  const dto = plainToInstance(UpdatePedidoDto, payload);

  return validate(dto, { whitelist: true });
}

describe('UpdatePedidoDto', () => {
  it.each(PEDIDO_ESTADOS)('acepta el estado %s', async (estado) => {
    const errors = await validatePayload({ estado });

    expect(errors).toEqual([]);
  });

  it('rechaza un estado fuera del contrato', async () => {
    const errors = await validatePayload({ estado: 'volando' });

    expect(errors[0]?.property).toBe('estado');
    expect(Object.keys(errors[0]?.constraints ?? {})).toContain('isIn');
  });

  it('rechaza un request sin estado', async () => {
    const errors = await validatePayload({});

    expect(errors[0]?.property).toBe('estado');
  });
});
