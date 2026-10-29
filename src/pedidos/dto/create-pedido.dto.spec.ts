import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { ValidationError } from 'class-validator';
import { CreatePedidoDto } from './create-pedido.dto.js';

async function validatePayload(payload: unknown): Promise<ValidationError[]> {
  const dto = plainToInstance(CreatePedidoDto, payload);

  return validate(dto, { whitelist: true });
}

function constraintNames(errors: readonly ValidationError[]): string[] {
  return errors.flatMap((error) => [
    ...Object.keys(error.constraints ?? {}),
    ...constraintNames(error.children ?? []),
  ]);
}

function findError(
  errors: readonly ValidationError[],
  property: string,
): ValidationError | undefined {
  for (const error of errors) {
    if (error.property === property) {
      return error;
    }

    const child = findError(error.children ?? [], property);

    if (child !== undefined) {
      return child;
    }
  }

  return undefined;
}

describe('CreatePedidoDto', () => {
  it('acepta un pedido con un detalle válido', async () => {
    const errors = await validatePayload({
      mesa_id: 1,
      detalles: [{ producto_id: 1, cantidad: 2 }],
    });

    expect(errors).toEqual([]);
  });

  it('convierte los ids enviados como texto', () => {
    const dto = plainToInstance(CreatePedidoDto, {
      mesa_id: '3',
      detalles: [{ producto_id: '7', cantidad: '2' }],
    });

    expect(dto.mesa_id).toBe(3);
    expect(dto.detalles[0]?.producto_id).toBe(7);
    expect(dto.detalles[0]?.cantidad).toBe(2);
  });

  it('rechaza un pedido sin detalles', async () => {
    const errors = await validatePayload({ mesa_id: 1 });

    expect(errors.map((error) => error.property)).toContain('detalles');
    expect(constraintNames(errors)).toContain('isArray');
  });

  it('exige al menos un detalle', async () => {
    const errors = await validatePayload({ mesa_id: 1, detalles: [] });

    expect(constraintNames(errors)).toContain('arrayMinSize');
  });

  it('rechaza una mesa que no es entero positivo', async () => {
    const errors = await validatePayload({
      mesa_id: 0,
      detalles: [{ producto_id: 1, cantidad: 1 }],
    });

    expect(errors[0]?.property).toBe('mesa_id');
    expect(constraintNames(errors)).toContain('min');
  });

  it('rechaza un detalle con cantidad cero', async () => {
    const errors = await validatePayload({
      mesa_id: 1,
      detalles: [{ producto_id: 1, cantidad: 0 }],
    });

    const cantidad = findError(errors, 'cantidad');

    expect(Object.keys(cantidad?.constraints ?? {})).toContain('min');
  });

  it('rechaza un detalle vacío', async () => {
    const errors = await validatePayload({
      mesa_id: 1,
      detalles: [{}],
    });

    expect(constraintNames(errors)).toEqual(
      expect.arrayContaining(['isInt', 'min']),
    );
  });

  it('descarta campos que no declara el contrato', async () => {
    const dto = plainToInstance(CreatePedidoDto, {
      mesa_id: 1,
      total: 300,
      usuario_id: 2,
      detalles: [{ producto_id: 1, cantidad: 1, subtotal: 100 }],
    });

    const errors = await validate(dto, { whitelist: true });

    expect(errors).toEqual([]);
    expect(dto).not.toHaveProperty('total');
    expect(dto).not.toHaveProperty('usuario_id');
    expect(dto.detalles[0]).not.toHaveProperty('subtotal');
  });
});
