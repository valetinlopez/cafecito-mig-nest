import type { ValidationError } from 'class-validator';
import {
  UNKNOWN_VALIDATION_MESSAGE,
  formatValidationDetail,
  translateConstraint,
} from './validation-messages.js';

function validationError(
  property: string,
  constraints: Record<string, string> = {},
  children: ValidationError[] = [],
): ValidationError {
  return { property, constraints, children };
}

describe('translateConstraint', () => {
  it('traduce los defaults de class-validator', () => {
    expect(translateConstraint('isEmail', '$property must be an email')).toBe(
      'debe ser un email válido',
    );
    expect(
      translateConstraint('isNotEmpty', '$property should not be empty'),
    ).toBe('no debe estar vacío');
  });

  it('interpola los parámetros del constraint', () => {
    expect(
      translateConstraint(
        'minLength',
        '$property must be longer than or equal to 3 characters',
      ),
    ).toBe('debe tener al menos 3 caracteres');

    expect(
      translateConstraint('min', '$property must not be less than 0'),
    ).toBe('debe ser mayor o igual a 0');

    expect(
      translateConstraint(
        'isEnum',
        '$property must be one of the following values: admin, mozo',
      ),
    ).toBe('debe ser uno de: admin, mozo');
  });

  it('traduce los defaults que ya vienen interpolados con el campo', () => {
    expect(
      translateConstraint('isString', 'nombre must be a string', 'nombre'),
    ).toBe('debe ser un texto');

    expect(
      translateConstraint(
        'minLength',
        'clave must be longer than or equal to 8 characters',
        'clave',
      ),
    ).toBe('debe tener al menos 8 caracteres');
  });

  it('traduce el mensaje de whitelist', () => {
    expect(
      translateConstraint(
        'whitelistValidation',
        'property campo_extra should not exist',
      ),
    ).toBe('no es un campo permitido');
  });

  it('respeta el mensaje propio del DTO (ya viene en español)', () => {
    expect(translateConstraint('isInt', 'debe ser un número entero')).toBe(
      'debe ser un número entero',
    );

    expect(translateConstraint('isInt', 'edad inválida', 'edad')).toBe(
      'edad inválida',
    );
  });

  it('cae al diccionario por constraint cuando el default es desconocido', () => {
    expect(translateConstraint('isEmail', '$property is not valid')).toBe(
      'debe ser un email válido',
    );
  });

  it('devuelve un mensaje genérico si no reconoce el constraint', () => {
    expect(
      translateConstraint('isPhoneNumber', '$property must be a valid phone'),
    ).toBe('no es válido');
  });
});

describe('formatValidationDetail', () => {
  it('arma el detalle con el primer error y el prefijo Campo', () => {
    expect(
      formatValidationDetail([
        validationError('precio', {
          min: '$property must not be less than 0',
        }),
      ]),
    ).toBe("Campo 'precio': debe ser mayor o igual a 0");
  });

  it('usa el primer constraint del primer error', () => {
    expect(
      formatValidationDetail([
        validationError('nombre', {
          isString: '$property must be a string',
          isNotEmpty: '$property should not be empty',
        }),
      ]),
    ).toBe("Campo 'nombre': debe ser un texto");
  });

  it('desciende a errores anidados y compone la ruta del campo', () => {
    expect(
      formatValidationDetail([
        validationError('direccion', {}, [
          validationError('calle', { isString: '$property must be a string' }),
        ]),
      ]),
    ).toBe("Campo 'direccion.calle': debe ser un texto");
  });

  it('devuelve el mensaje genérico si no hay constraints', () => {
    expect(formatValidationDetail([validationError('body')])).toBe(
      UNKNOWN_VALIDATION_MESSAGE,
    );
    expect(formatValidationDetail([])).toBe(UNKNOWN_VALIDATION_MESSAGE);
  });
});
