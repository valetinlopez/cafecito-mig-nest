import { HttpException, UnprocessableEntityException } from '@nestjs/common';
import type { ArgumentMetadata } from '@nestjs/common';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';
import { AppValidationPipe } from './validation.pipe.js';

class ProbeDto {
  @IsString()
  nombre!: string;

  @IsInt({ message: 'debe ser un número entero' })
  @Min(18, { message: 'debe ser mayor o igual a 18' })
  edad!: number;
}

class RequiredDto {
  @IsNotEmpty()
  nombre!: string;
}

const BODY_METADATA: ArgumentMetadata = {
  type: 'body',
  metatype: ProbeDto,
  data: '',
};

const REQUIRED_METADATA: ArgumentMetadata = {
  type: 'body',
  metatype: RequiredDto,
  data: '',
};

function detailOf(exception: unknown): string {
  if (!(exception instanceof HttpException)) {
    throw new Error('Se esperaba una HttpException');
  }

  const response = exception.getResponse();

  if (typeof response === 'string') {
    return response;
  }

  return String((response as { message?: unknown }).message);
}

async function rejectWith(
  pipe: AppValidationPipe,
  value: unknown,
  metadata: ArgumentMetadata = BODY_METADATA,
): Promise<unknown> {
  try {
    await pipe.transform(value, metadata);
  } catch (error: unknown) {
    return error;
  }

  throw new Error('El pipe aceptó un body que debía rechazar');
}

describe('AppValidationPipe', () => {
  const pipe = new AppValidationPipe();

  it('transforma un body válido en instancia del DTO', async () => {
    const result: unknown = await pipe.transform(
      { nombre: 'Ana', edad: 20 },
      BODY_METADATA,
    );

    expect(result).toBeInstanceOf(ProbeDto);
    expect(result).toMatchObject({ nombre: 'Ana', edad: 20 });
  });

  it('descarta los campos extra sin fallar (compatibilidad Pydantic)', async () => {
    const result = (await pipe.transform(
      { nombre: 'Ana', edad: 20, campo_extra: 'ignorado' },
      BODY_METADATA,
    )) as ProbeDto;

    expect(result).toBeInstanceOf(ProbeDto);
    expect(result).not.toHaveProperty('campo_extra');
  });

  it('responde 422 con el mensaje en español del default traducido', async () => {
    const exception = await rejectWith(pipe, { nombre: 123, edad: 20 });

    expect(exception).toBeInstanceOf(UnprocessableEntityException);
    expect((exception as HttpException).getStatus()).toBe(422);
    expect(detailOf(exception)).toBe("Campo 'nombre': debe ser un texto");
  });

  it('respeta el mensaje en español definido en el DTO', async () => {
    const exception = await rejectWith(pipe, { nombre: 'Ana', edad: 10 });

    expect(detailOf(exception)).toBe(
      "Campo 'edad': debe ser mayor o igual a 18",
    );
  });

  it('informa un campo obligatorio faltante', async () => {
    const exception = await rejectWith(pipe, {}, REQUIRED_METADATA);

    expect(detailOf(exception)).toBe("Campo 'nombre': no debe estar vacío");
  });
});
