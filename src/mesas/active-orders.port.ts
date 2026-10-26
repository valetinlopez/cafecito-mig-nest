import type { InjectionToken } from '@nestjs/common';

/** Port temporal para consultar pedidos activos sin mapear su tabla antes de MIG-30. */
export const ACTIVE_ORDERS_PORT: InjectionToken = 'ACTIVE_ORDERS_PORT';

export interface ActiveOrdersPort {
  hasUnpaidActiveOrderForTable(mesaId: number): Promise<boolean>;
}
