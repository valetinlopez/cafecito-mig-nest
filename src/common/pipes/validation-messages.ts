import type { ValidationError } from 'class-validator';

/**
 * Traducción de los mensajes de `class-validator` al español.
 *
 * Equivale a `TRADUCCIONES_PYDANTIC` del backend FastAPI. Hay dos caminos:
 *
 * 1. **Mensaje propio del DTO** (ADR 0001): ya viene en español y no contiene
 *    `$property`, así que se devuelve tal cual.
 * 2. **Mensaje default de `class-validator`**: contiene `$property` y se
 *    traduce con los diccionarios de abajo (exacto, con parámetros o por
 *    nombre de constraint cuando no hay match).
 */

export const UNKNOWN_VALIDATION_MESSAGE = 'Datos inválidos';

const PROPERTY_TOKEN = /\$property\s*/;

/**
 * `class-validator` interpola el nombre del campo antes de entregar el
 * mensaje (`nombre must be a string`). Los custom messages no arrancan con
 * `must`/`should`, y esa es la señal para no tocarlos.
 */
const DEFAULT_MESSAGE_PREFIX = /^(must|should)\b/;

/** `whitelist` genera un default con otro formato. */
const WHITELIST_MESSAGE = /^property \S+ should not exist$/;

/** Defaults sin parámetros: `message` normalizado (sin `$property`) → español. */
const EXACT_TRANSLATIONS: Readonly<Record<string, string>> = {
  'must be an email': 'debe ser un email válido',
  'should not be empty': 'no debe estar vacío',
  'must be a string': 'debe ser un texto',
  'must be a number conforming to the specified constraints':
    'debe ser un número',
  'must be an integer number': 'debe ser un número entero',
  'must be a boolean value': 'debe ser verdadero o falso',
  'must be a Date instance': 'debe ser una fecha',
  'must be a valid ISO 8601 date string': 'debe ser una fecha ISO-8601 válida',
  'must be an array': 'debe ser una lista',
  'must be a UUID': 'debe ser un UUID válido',
  'must be a positive number': 'debe ser mayor a 0',
  'must be a negative number': 'debe ser menor a 0',
  'must be a valid enum value': 'debe ser uno de los valores permitidos',
  'must be true': 'debe ser verdadero',
  'must be false': 'debe ser falso',
  'property should not exist': 'no es un campo permitido',
};

interface ParameterizedTranslation {
  pattern: RegExp;
  build: (match: RegExpExecArray) => string;
}

/** Defaults con parámetros (`$constraint1`, `$constraint2`, ...). */
const PARAMETERIZED_TRANSLATIONS: readonly ParameterizedTranslation[] = [
  {
    pattern: /^must be longer than or equal to (\d+) characters?$/,
    build: (match) => `debe tener al menos ${match[1]} caracteres`,
  },
  {
    pattern: /^must be shorter than or equal to (\d+) characters?$/,
    build: (match) => `debe tener como máximo ${match[1]} caracteres`,
  },
  {
    pattern: /^must not be less than (-?\d+(?:\.\d+)?)$/,
    build: (match) => `debe ser mayor o igual a ${match[1]}`,
  },
  {
    pattern: /^must not be greater than (-?\d+(?:\.\d+)?)$/,
    build: (match) => `debe ser menor o igual a ${match[1]}`,
  },
  {
    pattern: /^must be one of the following values: (.+)$/,
    build: (match) => `debe ser uno de: ${match[1]}`,
  },
  {
    pattern: /^must match (.+) regular expression$/,
    build: () => 'tiene un formato inválido',
  },
  {
    pattern: /^must be equal to (.+)$/,
    build: (match) => `debe ser igual a ${match[1]}`,
  },
  {
    pattern: /^must contain a (.+) value$/,
    build: (match) => `debe contener un valor ${match[1]}`,
  },
];

/** Último recurso: se elige por nombre de constraint, no por el texto. */
const CONSTRAINT_TRANSLATIONS: Readonly<Record<string, string>> = {
  isDefined: 'es obligatorio',
  isNotEmpty: 'no debe estar vacío',
  isNotEmptyObject: 'no debe estar vacío',
  isEmail: 'debe ser un email válido',
  isString: 'debe ser un texto',
  isNumber: 'debe ser un número',
  isInt: 'debe ser un número entero',
  isBoolean: 'debe ser verdadero o falso',
  isDate: 'debe ser una fecha válida',
  isDateString: 'debe ser una fecha válida',
  isArray: 'debe ser una lista',
  arrayNotEmpty: 'no debe estar vacío',
  arrayMinSize: 'tiene menos elementos de los permitidos',
  arrayMaxSize: 'tiene más elementos de los permitidos',
  arrayUnique: 'no debe tener elementos repetidos',
  isUUID: 'debe ser un UUID válido',
  isEnum: 'debe ser uno de los valores permitidos',
  isIn: 'debe ser uno de los valores permitidos',
  minLength: 'tiene una longitud inválida',
  maxLength: 'tiene una longitud inválida',
  length: 'tiene una longitud inválida',
  min: 'está fuera del rango permitido',
  max: 'está fuera del rango permitido',
  isPositive: 'debe ser mayor a 0',
  isNegative: 'debe ser menor a 0',
  matches: 'tiene un formato inválido',
  isObject: 'debe ser un objeto',
  whitelistValidation: 'no es un campo permitido',
};

/** Traduce un único constraint; los mensajes propios del DTO pasan intactos. */
export function translateConstraint(
  constraint: string,
  message: string,
  property = '',
): string {
  const template = message.trim();

  if (WHITELIST_MESSAGE.test(template)) {
    return 'no es un campo permitido';
  }

  let normalized = template;
  let isDefaultMessage = false;

  if (PROPERTY_TOKEN.test(template)) {
    normalized = template.replace(PROPERTY_TOKEN, '').trim();
    isDefaultMessage = true;
  } else if (property !== '' && template.startsWith(`${property} `)) {
    normalized = template.slice(property.length + 1).trim();
    isDefaultMessage = DEFAULT_MESSAGE_PREFIX.test(normalized);
  }

  if (!isDefaultMessage) {
    return template;
  }

  const exact = EXACT_TRANSLATIONS[normalized];

  if (exact !== undefined) {
    return exact;
  }

  for (const { pattern, build } of PARAMETERIZED_TRANSLATIONS) {
    const match = pattern.exec(normalized);

    if (match !== null) {
      return build(match);
    }
  }

  return CONSTRAINT_TRANSLATIONS[constraint] ?? 'no es válido';
}

interface FirstConstraint {
  field: string;
  constraint: string;
  message: string;
}

function findFirstConstraint(
  errors: readonly ValidationError[],
  parent?: string,
): FirstConstraint | undefined {
  for (const error of errors) {
    const field = parent ? `${parent}.${error.property}` : error.property;
    const [constraint, message] =
      Object.entries(error.constraints ?? {})[0] ?? [];

    if (constraint !== undefined && message !== undefined) {
      return { field, constraint, message };
    }

    const child = findFirstConstraint(error.children ?? [], field);

    if (child !== undefined) {
      return child;
    }
  }

  return undefined;
}

/**
 * Arma el `detail` de un 422: un solo string con el primer error (ADR 0001).
 *
 * ```json
 * { "detail": "Campo 'precio': debe ser mayor a 0" }
 * ```
 */
export function formatValidationDetail(
  errors: readonly ValidationError[],
): string {
  const first = findFirstConstraint(errors);

  if (first === undefined) {
    return UNKNOWN_VALIDATION_MESSAGE;
  }

  const message = translateConstraint(
    first.constraint,
    first.message,
    first.field.split('.').pop() ?? '',
  );

  return first.field === '' ? message : `Campo '${first.field}': ${message}`;
}
