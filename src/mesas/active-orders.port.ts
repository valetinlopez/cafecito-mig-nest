import type { InjectionToken } from '@nestjs/common';

/** Port temporal para consultar pedidos activos sin acoplar `mesas` a `pedidos`; se implementa en MIG-33. */
export const ACTIVE_ORDERS_PORT: InjectionToken = 'ACTIVE_ORDERS_PORT';

export interface ActiveOrdersPort {
  hasUnpaidActiveOrderForTable(mesaId: number): Promise<boolean>;
}
