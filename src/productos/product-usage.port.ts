import type { InjectionToken } from '@nestjs/common';

/** Port para saber si un producto figura en pedidos sin acoplar `productos` a `pedidos`. */
export const PRODUCT_USAGE_PORT: InjectionToken = 'PRODUCT_USAGE_PORT';

export interface ProductUsagePort {
  isProductInAnyOrder(productoId: number): Promise<boolean>;
}
