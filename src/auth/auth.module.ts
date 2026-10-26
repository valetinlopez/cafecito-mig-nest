import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import type { JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { AuthConfig } from '../config/auth.config.js';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';

/**
 * Autenticación con JWT (MIG-23/25).
 *
 * - `JwtModule` firma con `SECRET_KEY`, el `ALGORITHM` configurado y la
 *   expiración del legacy (`ACCESS_TOKEN_EXPIRE_MINUTES`, 480 por defecto).
 * - `JwtStrategy` valida firma y resuelve el usuario contra la base.
 * - `UsersModule` aporta `UsersService`; el repositorio no se filtra.
 *
 * `JwtStrategy` se registra acá: Passport guarda las estrategias en un registro
 * global, así el `JwtAuthGuard` de `common` funciona en cualquier módulo sin
 * duplicar la configuración del secreto.
 */
@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        const authConfig = configService.getOrThrow<AuthConfig>('auth');

        return {
          secret: authConfig.secretKey,
          signOptions: {
            algorithm: authConfig.algorithm,
            // `jsonwebtoken` interpreta un número como segundos.
            expiresIn: authConfig.accessTokenExpiresInMinutes * 60,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
