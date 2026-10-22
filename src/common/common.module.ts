import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { AllExceptionsFilter } from './filters/all-exceptions.filter.js';
import { ResponseTimeInterceptor } from './interceptors/response-time.interceptor.js';
import { AppValidationPipe } from './pipes/validation.pipe.js';

/**
 * Infraestructura transversal de la API.
 *
 * Se importa una sola vez en `AppModule` y los `APP_*` aplican a toda la
 * aplicación. Vive en un módulo (y no en `main.ts`) para que los e2e puedan
 * registrar exactamente las mismas piezas sin duplicar la lista de providers.
 *
 * CORS y el prefijo global no son providers: se configuran en `app.setup.ts`.
 */
@Module({
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_PIPE, useClass: AppValidationPipe },
    { provide: APP_INTERCEPTOR, useClass: ResponseTimeInterceptor },
  ],
})
export class CommonModule {}
