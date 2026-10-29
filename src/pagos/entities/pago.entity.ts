import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { numericTransformer } from '../../common/transformers/numeric.transformer.js';
import { utcTimestampTransformer } from '../../common/transformers/utc-timestamp.transformer.js';
import type { MetodoPago } from '../metodo-pago.js';

/**
 * Cobro de un pedido. Mapea la tabla `pagos` del backend legacy (`models/pago.py`,
 * MIG-31):
 *
 * | Propiedad    | Columna       | Tipo            | Restricciones                    |
 * | ------------ | ------------- | --------------- | -------------------------------- |
 * | `id`         | `id`          | `serial`        | PK, autoincremental              |
 * | `pedidoId`   | `pedido_id`   | `int`           | `UNIQUE`, not null               |
 * | `cajaId`     | `caja_id`     | `int`           | nullable (provisional)           |
 * | `usuarioId`  | `usuario_id`  | `int`           | nullable (provisional)           |
 * | `metodoPago` | `metodo_pago` | `varchar(30)`   | 5 valores del glosario           |
 * | `monto`      | `monto`       | `numeric(10,2)` | `number` vía `numericTransformer` |
 * | `fecha`      | `fecha`       | `timestamp`     | default `now()`, UTC naive       |
 *
 * El nombre de la restricción unique se declara explícito
 * (`pagos_pedido_id_key`) porque es el que PostgreSQL generó al crear la tabla
 * desde Python. Sin el nombre, `schema:log` (MIG-44) propone recrearla.
 *
 * **Relaciones diferidas:** el ticket pide `@ManyToOne(() => Pedido)` y la caja
 * referencia `cajas`, pero ambas entities todavía no existen. Declararlas
 * obligaría a un mapeo parcial de tablas compartidas con producción y, con
 * `synchronize` en desarrollo, TypeORM podría alterarlas (constitución §4,
 * convenciones §6.1). Por eso `pedidoId`, `cajaId` y `usuarioId` quedan como
 * columnas escalares; las relaciones se agregan en MIG-32/MIG-44, cuando exista
 * la contra-parte.
 *
 * `cajaId` y `usuarioId` son nullable a propósito: hay pagos históricos previos
 * a la apertura de caja y usuarios dados de baja lógicamente (el contrato ya
 * tipa `usuario_nombre: string | null`, ver `DECISIONS.md` D-08). La regla
 * "todo cobro nuevo pertenece a la caja abierta" se valida en el service del
 * cobro, no con un `NOT NULL`.
 */
@Entity('pagos')
@Unique('pagos_pedido_id_key', ['pedidoId'])
export class Pago {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'pedido_id', type: 'int' })
  pedidoId!: number;

  @Column({ name: 'caja_id', type: 'int', nullable: true })
  cajaId!: number | null;

  @Column({ name: 'usuario_id', type: 'int', nullable: true })
  usuarioId!: number | null;

  @Column({ name: 'metodo_pago', type: 'varchar', length: 30 })
  metodoPago!: MetodoPago;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: numericTransformer,
  })
  monto!: number;

  @Column({
    type: 'timestamp',
    default: () => 'now()',
    transformer: utcTimestampTransformer,
  })
  fecha!: Date;
}
