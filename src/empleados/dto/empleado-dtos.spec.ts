import type { ArgumentMetadata } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { ValidationError } from 'class-validator';
import { AppValidationPipe } from '../../common/pipes/validation.pipe.js';
import { CreateEmpleadoDto } from './create-empleado.dto.js';
import { UpdateEmpleadoDto } from './update-empleado.dto.js';

/**
 * Validaciones de los DTOs de empleados (MIG-22, CFB-112).
 *
 * La regla central no es un decorador sino una ausencia: `rol` no está
 * declarado en ninguno de los dos DTOs. El test comprueba que el
 * `ValidationPipe` global lo descarta, así el service nunca puede recibir un rol
 * distinto de `mozo` desde estos endpoints.
 */
async function errorsOf<T extends object>(
  metatype: new () => T,
  payload: object,
): Promise<ValidationError[]> {
  return validate(plainToInstance(metatype, payload), { whitelist: true });
}

async function invalidFields<T extends object>(
  metatype: new () => T,
  payload: object,
): Promise<string[]> {
  const errors = await errorsOf(metatype, payload);
  return errors.map((error) => error.property);
}

function bodyMetadata<T>(metatype: new () => T): ArgumentMetadata {
  return { type: 'body', metatype };
}

describe('CreateEmpleadoDto', () => {
  it('acepta un alta válida sin rol', async () => {
    expect(
      await errorsOf(CreateEmpleadoDto, {
        nombre: 'Valentín López',
        email: 'valentin@cafecito.com',
        password: 'secreto123',
      }),
    ).toEqual([]);
  });

  it('rechaza email inválido, password corta y nombre ausente', async () => {
    expect(
      await invalidFields(CreateEmpleadoDto, {
        email: 'no-es-email',
        password: '123',
      }),
    ).toEqual(expect.arrayContaining(['nombre', 'email', 'password']));
  });

  it('descarta el rol enviado por el cliente', async () => {
    const pipe = new AppValidationPipe();

    const result = (await pipe.transform(
      {
        nombre: 'Valentín López',
        email: 'valentin@cafecito.com',
        password: 'secreto123',
        rol: 'admin',
      },
      bodyMetadata(CreateEmpleadoDto),
    )) as CreateEmpleadoDto;

    expect(result).toBeInstanceOf(CreateEmpleadoDto);
    expect(result).not.toHaveProperty('rol');
    expect(result).toEqual({
      nombre: 'Valentín López',
      email: 'valentin@cafecito.com',
      password: 'secreto123',
    });
  });
});

describe('UpdateEmpleadoDto', () => {
  it('acepta un body vacío (todos los campos son opcionales)', async () => {
    expect(await errorsOf(UpdateEmpleadoDto, {})).toEqual([]);
  });

  it('acepta una baja lógica', async () => {
    expect(await errorsOf(UpdateEmpleadoDto, { activo: false })).toEqual([]);
  });

  it('rechaza activo con un tipo que no es booleano', async () => {
    expect(await invalidFields(UpdateEmpleadoDto, { activo: 'no' })).toEqual([
      'activo',
    ]);
  });

  it('descarta el rol enviado por el cliente', async () => {
    const pipe = new AppValidationPipe();

    const result = (await pipe.transform(
      { nombre: 'Valentín López', rol: 'admin' },
      bodyMetadata(UpdateEmpleadoDto),
    )) as UpdateEmpleadoDto;

    expect(result).toBeInstanceOf(UpdateEmpleadoDto);
    expect(result).not.toHaveProperty('rol');
    expect(result).toEqual({ nombre: 'Valentín López' });
  });
});
