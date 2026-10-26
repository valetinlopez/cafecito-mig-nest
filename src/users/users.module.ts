import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from './entities/usuario.entity.js';
import { UsersService } from './users.service.js';

/**
 * Dueño de la entity `Usuario` y de su acceso a datos (MIG-22/MIG-25).
 *
 * `TypeOrmModule.forFeature([Usuario])` registra la entity en el `DataSource`
 * global (`autoLoadEntities: true`) y deja el repositorio disponible para
 * `UsersService`, que es lo único que se exporta.
 *
 * El repositorio **no se exporta**: `auth` y `empleados` consumen
 * `UsersService`, nunca `@InjectRepository(Usuario)` (D-01/D-02).
 *
 * No tiene controller: los endpoints de identidad son de `auth` y los de
 * personal de `empleados`.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Usuario])],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
