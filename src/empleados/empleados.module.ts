import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { EmpleadosController } from './empleados.controller.js';
import { EmpleadosService } from './empleados.service.js';

@Module({
	imports: [UsersModule],
	controllers: [EmpleadosController],
	providers: [EmpleadosService],
})
export class EmpleadosModule {}
