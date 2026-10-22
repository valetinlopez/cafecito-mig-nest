import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module.js';
import { CajaModule } from './caja/caja.module.js';
import { CategoriasModule } from './categorias/categorias.module.js';
import { CommonModule } from './common/common.module.js';
import appConfig from './config/app.config.js';
import authConfig from './config/auth.config.js';
import databaseConfig from './config/database.config.js';
import { validateEnvironment } from './config/env.validation.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { DatabaseModule } from './database/database.module.js';
import { EmpleadosModule } from './empleados/empleados.module.js';
import { HealthModule } from './health/health.module.js';
import { MesasModule } from './mesas/mesas.module.js';
import { PagosModule } from './pagos/pagos.module.js';
import { PedidosModule } from './pedidos/pedidos.module.js';
import { ProductosModule } from './productos/productos.module.js';
import { ReportesModule } from './reportes/reportes.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env.local', '.env'],
      // En producción las variables vienen del entorno del deploy, no de un
      // archivo que pueda quedar en la imagen.
      ignoreEnvFile: process.env.NODE_ENV === 'production',
      load: [appConfig, authConfig, databaseConfig],
      validate: validateEnvironment,
    }),
    DatabaseModule.forRoot(),
    CommonModule,
    HealthModule,
    AuthModule,
    UsersModule,
    EmpleadosModule,
    MesasModule,
    CategoriasModule,
    ProductosModule,
    PedidosModule,
    PagosModule,
    CajaModule,
    DashboardModule,
    ReportesModule,
  ],
})
export class AppModule {}
