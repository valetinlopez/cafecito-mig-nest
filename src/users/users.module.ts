import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from './entities/usuario.entity.js';

/**
 * Dueño de la entity `Usuario` y de su acceso a datos (MIG-22).
 *
 * `TypeOrmModule.forFeature([Usuario])` registra la entity en el `DataSource`
 * global (`autoLoadEntities: true`) y deja el repositorio listo para el
 * `UsersService`, que agrega `auth`/`empleados` en MIG-25/26.
 *
 * El repositorio **no se exporta**: `auth` y `empleados` consumen
 * `UsersService`, nunca `@InjectRepository(Usuario)` (D-01/D-02).
 *
 * No tiene controller: los endpoints de identidad son de `auth` y los de
 * personal de `empleados`.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Usuario])],
})
export class UsersModule {}
