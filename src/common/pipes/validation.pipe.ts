import {
  Injectable,
  UnprocessableEntityException,
  ValidationPipe,
} from '@nestjs/common';
import type { ValidationError } from 'class-validator';
import { formatValidationDetail } from './validation-messages.js';

/**
 * `ValidationPipe` global (ADR 0001, contrato D-03).
 *
 * Diferencias con el default de NestJS:
 * - Responde **422**, no 400: el front clasifica los errores de formulario por
 *   código.
 * - Devuelve **un** `detail` en español con formato `Campo 'x': mensaje`.
 * - `forbidNonWhitelisted: false` porque Pydantic ignoraba los campos extra:
 *   endurecerlo rompería requests que hoy funcionan (ADR 0001, D-05 de
 *   `common`). `whitelist` los descarta en lugar de propagarlos.
 */
@Injectable()
export class AppValidationPipe extends ValidationPipe {
  constructor() {
    super({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      validationError: { target: false, value: false },
      exceptionFactory: (errors: ValidationError[]) =>
        new UnprocessableEntityException(formatValidationDetail(errors)),
    });
  }
}
