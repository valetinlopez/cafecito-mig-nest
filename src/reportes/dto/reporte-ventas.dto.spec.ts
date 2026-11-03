import { validate } from 'class-validator';
import { formatValidationDetail } from '../../common/pipes/validation-messages.js';
import { ReporteVentasQueryDto } from './reporte-ventas-query.dto.js';
import {
  ReporteVentasResponseDto,
  type ReporteVentasData,
} from './reporte-ventas-response.dto.js';

async function detailFor(dto: ReporteVentasQueryDto): Promise<string> {
  return formatValidationDetail(await validate(dto));
}

function buildQuery(overrides: Partial<ReporteVentasQueryDto>) {
  return Object.assign(new ReporteVentasQueryDto(), {
    desde: '2026-10-01',
    hasta: '2026-10-19',
    ...overrides,
  });
}

const DATA: ReporteVentasData = {
  desde: '2026-10-01',
  hasta: '2026-10-19',
  resumen: {
    total_vendido: 125000,
    cantidad_cobros: 84,
    pedidos_cobrados: 80,
    ticket_promedio: 1488.1,
  },
  ventas_por_metodo: [{ metodo_pago: 'efectivo', cantidad: 40, total: 60000 }],
  productos_mas_vendidos: [
    { producto_id: 1, nombre: 'Café con leche', cantidad: 120, total: 102000 },
  ],
  mesas_utilizadas: [
    { mesa_id: 1, numero: 1, cantidad_pedidos: 18, total: 27000 },
  ],
  cajas: [
    {
      caja_id: 1,
      estado: 'abierta',
      fecha_apertura: '2026-10-18T11:00:00.000Z',
      fecha_cierre: null,
      monto_inicial: 1000,
      ventas_efectivo: 40000,
      monto_final: null,
      diferencia: null,
    },
  ],
};

describe('ReporteVentasQueryDto', () => {
  it('acepta un período con fechas YYYY-MM-DD válidas', async () => {
    await expect(validate(buildQuery({}))).resolves.toHaveLength(0);
  });

  it('exige desde y hasta', async () => {
    await expect(detailFor(buildQuery({ desde: undefined }))).resolves.toBe(
      "Campo 'desde': es obligatorio",
    );
    await expect(detailFor(buildQuery({ hasta: undefined }))).resolves.toBe(
      "Campo 'hasta': es obligatorio",
    );
  });

  it('exige el formato contractual YYYY-MM-DD', async () => {
    await expect(detailFor(buildQuery({ desde: '01-10-2026' }))).resolves.toBe(
      "Campo 'desde': debe tener el formato YYYY-MM-DD",
    );
    await expect(
      detailFor(buildQuery({ hasta: '2026-10-19T00:00:00Z' })),
    ).resolves.toBe("Campo 'hasta': debe tener el formato YYYY-MM-DD");
  });

  it('rechaza fechas inexistentes en el calendario', async () => {
    await expect(detailFor(buildQuery({ desde: '2026-02-30' }))).resolves.toBe(
      "Campo 'desde': debe ser una fecha válida",
    );
  });
});

describe('ReporteVentasResponseDto', () => {
  it('ensambla el shape contractual en snake_case', () => {
    const dto = ReporteVentasResponseDto.fromData(DATA);

    expect(dto).toBeInstanceOf(ReporteVentasResponseDto);
    expect(dto).toEqual({
      periodo: { desde: DATA.desde, hasta: DATA.hasta },
      resumen: DATA.resumen,
      ventas_por_metodo: DATA.ventas_por_metodo,
      productos_mas_vendidos: DATA.productos_mas_vendidos,
      mesas_utilizadas: DATA.mesas_utilizadas,
      cajas: DATA.cajas,
    });
    expect(JSON.stringify(dto)).not.toContain('totalVendido');
  });

  it('conserva los nulos explícitos de la caja abierta', () => {
    const dto = ReporteVentasResponseDto.fromData(DATA);

    expect(dto.cajas[0]).toMatchObject({
      fecha_cierre: null,
      monto_final: null,
      diferencia: null,
    });
  });

  it('copia las colecciones para no compartir estado con el service', () => {
    const source: ReporteVentasData = {
      ...DATA,
      ventas_por_metodo: [...DATA.ventas_por_metodo],
    };
    const dto = ReporteVentasResponseDto.fromData(source);

    expect(dto.ventas_por_metodo).not.toBe(source.ventas_por_metodo);
    expect(dto.ventas_por_metodo[0]).not.toBe(source.ventas_por_metodo[0]);
  });
});
