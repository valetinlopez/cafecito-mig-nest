import type { ArgumentMetadata } from '@nestjs/common';
import { UnprocessableEntityException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { ValidationError } from 'class-validator';
import { AppValidationPipe } from '../../common/pipes/validation.pipe.js';
import { ChangePasswordDto } from './change-password.dto.js';
import { ForgotPasswordDto } from './forgot-password.dto.js';
import { LoginDto } from './login.dto.js';
import { RegisterDto } from './register.dto.js';
import { ResetPasswordDto } from './reset-password.dto.js';
import { UpdateProfileDto } from './update-profile.dto.js';

/**
 * Validaciones de los DTOs de auth (MIG-22).
 *
 * Se valida con `class-validator` directo para aislar cada regla y, además, con
 * el `AppValidationPipe` real para comprobar la integración con el contrato:
 * `422` + `Campo '<campo>': <mensaje en español>`.
 */
async function errorsOf<T extends object>(
  metatype: new () => T,
  payload: object,
): Promise<ValidationError[]> {
  return validate(plainToInstance(metatype, payload), {
    whitelist: true,
  });
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

describe('LoginDto', () => {
  it('acepta credenciales válidas', async () => {
    const errors = await errorsOf(LoginDto, {
      email: 'admin@cafecito.com',
      password: '123456',
    });

    expect(errors).toEqual([]);
  });

  it('rechaza un email inválido y la falta de password', async () => {
    expect(await invalidFields(LoginDto, { email: 'no-es-email' })).toEqual([
      'email',
      'password',
    ]);
  });

  it('no exige longitud mínima en el login', async () => {
    const errors = await errorsOf(LoginDto, {
      email: 'admin@cafecito.com',
      password: '123',
    });

    expect(errors).toEqual([]);
  });
});

describe('RegisterDto', () => {
  it('acepta un alta válida', async () => {
    const errors = await errorsOf(RegisterDto, {
      nombre: 'Valentín López',
      email: 'valentin@cafecito.com',
      password: 'secreto123',
      rol: 'mozo',
    });

    expect(errors).toEqual([]);
  });

  it('rechaza un rol fuera de admin/mozo', async () => {
    expect(
      await invalidFields(RegisterDto, {
        nombre: 'Valentín López',
        email: 'valentin@cafecito.com',
        password: 'secreto123',
        rol: 'superadmin',
      }),
    ).toEqual(['rol']);
  });

  it('rechaza password corta, email inválido y nombre ausente', async () => {
    expect(
      await invalidFields(RegisterDto, {
        email: 'no-es-email',
        password: '123',
      }),
    ).toEqual(expect.arrayContaining(['nombre', 'email', 'password']));
  });
});

describe('UpdateProfileDto', () => {
  it('acepta un body vacío (todos los campos son opcionales)', async () => {
    expect(await errorsOf(UpdateProfileDto, {})).toEqual([]);
  });

  it('acepta sólo los campos enviados', async () => {
    expect(
      await errorsOf(UpdateProfileDto, { nombre: 'Valentín López' }),
    ).toEqual([]);
  });

  it('rechaza un email inválido', async () => {
    expect(
      await invalidFields(UpdateProfileDto, { email: 'no-es-email' }),
    ).toEqual(['email']);
  });
});

describe('ChangePasswordDto', () => {
  it('acepta un cambio válido', async () => {
    expect(
      await errorsOf(ChangePasswordDto, {
        password_actual: 'secreto123',
        password_nueva: 'nuevoSecreto456',
      }),
    ).toEqual([]);
  });

  it('exige la contraseña actual y un mínimo de 6 en la nueva', async () => {
    expect(
      await invalidFields(ChangePasswordDto, { password_nueva: '123' }),
    ).toEqual(['password_actual', 'password_nueva']);
  });
});

describe('ForgotPasswordDto', () => {
  it('acepta un email válido y rechaza uno inválido', async () => {
    expect(
      await errorsOf(ForgotPasswordDto, { email: 'valentin@cafecito.com' }),
    ).toEqual([]);
    expect(await invalidFields(ForgotPasswordDto, { email: 'nope' })).toEqual([
      'email',
    ]);
  });
});

describe('ResetPasswordDto', () => {
  it('acepta un reset válido', async () => {
    expect(
      await errorsOf(ResetPasswordDto, {
        token: 'token-de-reset',
        password_nueva: 'nuevoSecreto456',
      }),
    ).toEqual([]);
  });

  it('exige token y un mínimo de 6 en la nueva', async () => {
    expect(
      await invalidFields(ResetPasswordDto, { password_nueva: '123' }),
    ).toEqual(['token', 'password_nueva']);
  });
});

describe('AppValidationPipe con DTOs de auth', () => {
  const pipe = new AppValidationPipe();

  it('responde 422 con el detalle en español', async () => {
    await expect(
      pipe.transform({ email: 'no-es-email' }, bodyMetadata(LoginDto)),
    ).rejects.toMatchObject({
      status: 422,
      response: {
        message: "Campo 'email': debe ser un email válido",
      },
    });
  });

  it('lanza UnprocessableEntityException', async () => {
    await expect(
      pipe.transform(
        { password_nueva: '123' },
        bodyMetadata(ChangePasswordDto),
      ),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('descarta el rol enviado a UpdateProfileDto', async () => {
    const result = (await pipe.transform(
      { nombre: 'Valentín López', rol: 'admin' },
      bodyMetadata(UpdateProfileDto),
    )) as UpdateProfileDto;

    expect(result).toBeInstanceOf(UpdateProfileDto);
    expect(result).not.toHaveProperty('rol');
  });
});
