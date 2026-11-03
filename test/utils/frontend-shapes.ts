/**
 * Copia en runtime de `frontend/types/api.ts` (repo `grupo1`, commit `3dfdb1f`).
 *
 * Las interfaces de TypeScript no existen al ejecutar, así que cada una se
 * describe como un objeto comparable contra la respuesta real. Si el frontend
 * cambia un tipo, esta copia se actualiza en el mismo PR (spec 038, RNF-02).
 *
 * Las fechas se declaran `iso` aunque el frontend las tipe `string`: además del
 * tipo se exige ISO-8601 UTC con `Z` (ADR 0007).
 */
export type FieldShape =
  | 'number'
  | 'string'
  | 'boolean'
  | 'iso'
  | NullableShape
  | OneOfShape
  | ArrayShape
  | ObjectShape;

interface NullableShape {
  readonly kind: 'nullable';
  readonly inner: FieldShape;
}

interface OneOfShape {
  readonly kind: 'oneOf';
  readonly values: readonly string[];
}

interface ArrayShape {
  readonly kind: 'array';
  readonly item: FieldShape;
}

export interface ObjectShape {
  readonly [campo: string]: FieldShape;
}

const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

export function nullable(inner: FieldShape): NullableShape {
  return { kind: 'nullable', inner };
}

export function oneOf(...values: string[]): OneOfShape {
  return { kind: 'oneOf', values };
}

export function arrayOf(item: FieldShape): ArrayShape {
  return { kind: 'array', item };
}

function isModifier(
  shape: FieldShape,
): shape is NullableShape | OneOfShape | ArrayShape {
  return typeof shape === 'object' && typeof shape.kind === 'string';
}

function mismatch(path: string, expected: string, value: unknown): string {
  return `${path}: se esperaba ${expected}, llegó ${JSON.stringify(value)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Devuelve las diferencias entre `value` y `shape`; vacío si coinciden exacto. */
export function findShapeErrors(
  value: unknown,
  shape: FieldShape,
  path = '',
): string[] {
  if (typeof shape === 'string') {
    return findPrimitiveErrors(value, shape, path);
  }

  if (isModifier(shape)) {
    switch (shape.kind) {
      case 'nullable':
        return value === null ? [] : findShapeErrors(value, shape.inner, path);
      case 'oneOf':
        return typeof value === 'string' && shape.values.includes(value)
          ? []
          : [mismatch(path, shape.values.join(' | '), value)];
      case 'array':
        return Array.isArray(value)
          ? value.flatMap((item, index) =>
              findShapeErrors(item, shape.item, `${path}[${index}]`),
            )
          : [mismatch(path, 'lista', value)];
    }
  }

  if (!isRecord(value)) {
    return [mismatch(path, 'objeto', value)];
  }

  const prefix = path === '' ? '' : `${path}.`;
  const expectedErrors = Object.entries(shape).flatMap(([campo, fieldShape]) =>
    campo in value
      ? findShapeErrors(value[campo], fieldShape, `${prefix}${campo}`)
      : [`${prefix}${campo}: campo faltante`],
  );
  const unexpectedErrors = Object.keys(value)
    .filter((campo) => !(campo in shape))
    .map((campo) => `${prefix}${campo}: campo inesperado`);

  return [...expectedErrors, ...unexpectedErrors];
}

function findPrimitiveErrors(
  value: unknown,
  shape: 'number' | 'string' | 'boolean' | 'iso',
  path: string,
): string[] {
  switch (shape) {
    case 'number':
      return typeof value === 'number' && Number.isFinite(value)
        ? []
        : [mismatch(path, 'number', value)];
    case 'iso':
      return typeof value === 'string' && ISO_UTC.test(value)
        ? []
        : [mismatch(path, 'ISO-8601 UTC con Z', value)];
    default:
      return typeof value === shape ? [] : [mismatch(path, shape, value)];
  }
}

/** Falla el test mostrando todas las diferencias con el tipo del frontend. */
export function expectFrontendShape(value: unknown, shape: FieldShape): void {
  expect(findShapeErrors(value, shape)).toEqual([]);
}

const METODO_PAGO = oneOf(
  'efectivo',
  'debito',
  'credito',
  'transferencia',
  'mercado_pago',
);

export const USUARIO: ObjectShape = {
  id: 'number',
  nombre: 'string',
  email: 'string',
  rol: oneOf('admin', 'mozo'),
  activo: 'boolean',
};

export const TOKEN_RESPONSE: ObjectShape = {
  access_token: 'string',
  token_type: 'string',
  usuario: USUARIO,
};

export const MESSAGE_RESPONSE: ObjectShape = { message: 'string' };

export const FORGOT_PASSWORD_RESPONSE: ObjectShape = {
  message: 'string',
  reset_token: nullable('string'),
};

export const CATEGORIA: ObjectShape = { id: 'number', nombre: 'string' };

export const PRODUCTO: ObjectShape = {
  id: 'number',
  nombre: 'string',
  descripcion: nullable('string'),
  precio: 'number',
  stock: 'number',
  stock_minimo: 'number',
  disponible: 'boolean',
  categoria: CATEGORIA,
};

export const MESA: ObjectShape = {
  id: 'number',
  numero: 'number',
  estado: oneOf(
    'libre',
    'ocupada',
    'reservada',
    'pendiente_cobro',
    'en_limpieza',
  ),
};

export const DETALLE_PEDIDO: ObjectShape = {
  id: 'number',
  producto_id: 'number',
  cantidad: 'number',
  subtotal: 'number',
};

export const PEDIDO: ObjectShape = {
  id: 'number',
  estado: oneOf(
    'pendiente',
    'en_preparacion',
    'listo',
    'entregado',
    'pagado',
    'cancelado',
  ),
  total: 'number',
  fecha: 'iso',
  mesa: MESA,
  usuario: USUARIO,
  detalles: arrayOf(DETALLE_PEDIDO),
};

export const CAJA: ObjectShape = {
  id: 'number',
  fecha_apertura: 'iso',
  fecha_cierre: nullable('iso'),
  monto_inicial: 'number',
  monto_final: nullable('number'),
  estado: oneOf('abierta', 'cerrada'),
  total_ventas: 'number',
};

export const MOVIMIENTO_CAJA: ObjectShape = {
  id: 'number',
  fecha: 'iso',
  pedido_id: 'number',
  mesa_numero: 'number',
  monto: 'number',
  metodo_pago: METODO_PAGO,
  usuario_nombre: nullable('string'),
};

export const DASHBOARD_RESUMEN: ObjectShape = {
  ventas_dia: { total: 'number', pagos: 'number' },
  mesas: {
    total: 'number',
    libres: 'number',
    ocupadas: 'number',
    pendientes_cobro: 'number',
  },
  pedidos_activos: {
    total: 'number',
    pendientes: 'number',
    en_preparacion: 'number',
    listos: 'number',
    entregados: 'number',
  },
  caja: {
    estado: 'string',
    monto_inicial: nullable('number'),
    fecha_apertura: nullable('iso'),
  },
  ultimos_pedidos: arrayOf({
    id: 'number',
    mesa: 'number',
    items: 'number',
    total: 'number',
    estado: 'string',
  }),
};

export const REPORTE_VENTAS: ObjectShape = {
  periodo: { desde: 'string', hasta: 'string' },
  resumen: {
    total_vendido: 'number',
    cantidad_cobros: 'number',
    pedidos_cobrados: 'number',
    ticket_promedio: 'number',
  },
  ventas_por_metodo: arrayOf({
    metodo_pago: 'string',
    cantidad: 'number',
    total: 'number',
  }),
  productos_mas_vendidos: arrayOf({
    producto_id: 'number',
    nombre: 'string',
    cantidad: 'number',
    total: 'number',
  }),
  mesas_utilizadas: arrayOf({
    mesa_id: 'number',
    numero: 'number',
    cantidad_pedidos: 'number',
    total: 'number',
  }),
  cajas: arrayOf({
    caja_id: 'number',
    estado: 'string',
    fecha_apertura: 'iso',
    fecha_cierre: nullable('iso'),
    monto_inicial: 'number',
    ventas_efectivo: 'number',
    monto_final: nullable('number'),
    diferencia: nullable('number'),
  }),
};

export const API_ERROR: ObjectShape = { detail: 'string' };
