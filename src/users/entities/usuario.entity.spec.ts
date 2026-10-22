import { instanceToPlain } from 'class-transformer';
import { getMetadataArgsStorage } from 'typeorm';
import { ROLES } from '../rol.js';
import { Usuario } from './usuario.entity.js';

/**
 * Mapeo de la entity `Usuario` contra la tabla `usuarios` (MIG-22).
 *
 * Se inspecciona la metadata que registran los decoradores de TypeORM, sin
 * levantar PostgreSQL: verifica nombres de tabla/columna, tipos y restricciones
 * que `schema:log` comparará contra la base compartida (MIG-44).
 */
describe('Usuario (entity)', () => {
  const storage = getMetadataArgsStorage();

  function columnOf(propertyName: string): (typeof storage.columns)[number] {
    const column = storage
      .filterColumns(Usuario)
      .find((candidate) => candidate.propertyName === propertyName);

    if (column === undefined) {
      throw new Error(
        `La entity Usuario no declara la columna '${propertyName}'`,
      );
    }

    return column;
  }

  it('mapea la tabla `usuarios`', () => {
    const table = storage.filterTables(Usuario)[0];

    expect(table?.name).toBe('usuarios');
    expect(table?.type).toBe('regular');
  });

  it('declara las columnas con el tipo y largo del legacy', () => {
    expect(columnOf('nombre').options).toMatchObject({
      type: 'varchar',
      length: 100,
    });
    expect(columnOf('email').options).toMatchObject({
      type: 'varchar',
      length: 150,
    });
    expect(columnOf('passwordHash').options).toMatchObject({
      name: 'password_hash',
      type: 'varchar',
      length: 255,
    });
    expect(columnOf('rol').options).toMatchObject({
      type: 'varchar',
      length: 20,
    });
    expect(columnOf('activo').options).toMatchObject({
      type: 'boolean',
      default: true,
    });
  });

  it('genera el id de forma autoincremental', () => {
    const generated = storage.findGenerated(Usuario, 'id');

    expect(generated?.strategy).toBe('increment');
    expect(columnOf('id').options.primary).toBe(true);
  });

  it('declara el unique del email con el nombre de PostgreSQL', () => {
    const unique = storage.uniques.find(
      (candidate) => candidate.target === Usuario,
    );

    expect(unique?.name).toBe('usuarios_email_key');
    expect(unique?.columns).toEqual(['email']);
  });

  it('expone los roles del contrato', () => {
    expect(ROLES).toEqual(['admin', 'mozo']);
  });

  it('excluye password_hash al serializar la entity', () => {
    const usuario = Object.assign(new Usuario(), {
      id: 1,
      nombre: 'Valentín López',
      email: 'valentin@cafecito.com',
      passwordHash: '$2b$10$hash-secreto',
      rol: 'admin',
      activo: true,
    });

    const plain = instanceToPlain(usuario) as Record<string, unknown>;

    expect(plain).not.toHaveProperty('passwordHash');
    expect(JSON.stringify(plain)).not.toContain('hash-secreto');
  });
});
