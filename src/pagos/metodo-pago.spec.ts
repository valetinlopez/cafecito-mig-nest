import { METODOS_PAGO } from './metodo-pago.js';

describe('METODOS_PAGO', () => {
  it('contiene los cinco métodos del glosario y del contrato', () => {
    expect(METODOS_PAGO).toEqual([
      'efectivo',
      'debito',
      'credito',
      'transferencia',
      'mercado_pago',
    ]);
  });

  it('viaja en snake_case, sin traducciones ni capitalización', () => {
    expect(
      METODOS_PAGO.every((metodo) => metodo === metodo.toLowerCase()),
    ).toBe(true);
    expect(METODOS_PAGO).toContain('mercado_pago');
  });
});
