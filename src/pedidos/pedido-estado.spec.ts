import { PEDIDO_ESTADOS } from './pedido-estado.js';

describe('PEDIDO_ESTADOS', () => {
  it('declara los seis estados del contrato en orden', () => {
    expect(PEDIDO_ESTADOS).toEqual([
      'pendiente',
      'en_preparacion',
      'listo',
      'entregado',
      'pagado',
      'cancelado',
    ]);
  });

  it('no repite estados', () => {
    expect(new Set(PEDIDO_ESTADOS).size).toBe(PEDIDO_ESTADOS.length);
  });
});
