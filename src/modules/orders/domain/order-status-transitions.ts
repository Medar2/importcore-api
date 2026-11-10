import type { OrderStatus } from '../entities/order.entity';
import type { ContainerStatus } from '../../shipping/entities/shipment-container.entity';

/**
 * Transiciones manuales permitidas (M5). DISPATCHED queda fuera: solo se
 * alcanza vía el endpoint de despacho, que aplica BR-003.
 */
const MANUAL_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT: ['ARRIVED'],
  ARRIVED: ['READY'],
  READY: [],
  DISPATCHED: [],
  CANCELLED: [],
};

export function allowedTransitions(from: OrderStatus): readonly OrderStatus[] {
  return MANUAL_TRANSITIONS[from] ?? [];
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return allowedTransitions(from).includes(to);
}

/** Estado de pedido que implica cada evento del contenedor asignado. */
const CONTAINER_TO_ORDER: Partial<Record<ContainerStatus, OrderStatus>> = {
  IN_TRANSIT: 'IN_TRANSIT',
  ARRIVED: 'ARRIVED',
};

/**
 * Nuevo estado del pedido cuando su contenedor cambia de estado, o null si
 * no aplica (evento sin efecto o transición inválida desde el estado actual).
 */
export function orderStatusForContainer(
  containerStatus: ContainerStatus,
  orderStatus: OrderStatus,
): OrderStatus | null {
  const target = CONTAINER_TO_ORDER[containerStatus];
  if (!target || !canTransition(orderStatus, target)) return null;
  return target;
}
