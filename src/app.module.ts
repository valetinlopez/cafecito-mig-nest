import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module.js';
import { CajaModule } from './caja/caja.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
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
    }),
    HealthModule,
    AuthModule,
    UsersModule,
    EmpleadosModule,
    MesasModule,
    // CategoriasModule (MIG-18) se registra acá cuando MIG-19 configure
    // TypeOrmModule.forRoot(): forFeature necesita un DataSource global.
    ProductosModule,
    PedidosModule,
    PagosModule,
    CajaModule,
    DashboardModule,
    ReportesModule,
  ],
})
export class AppModule {}
