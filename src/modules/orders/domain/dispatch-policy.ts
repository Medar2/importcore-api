import type { OrderStatus } from '../entities/order.entity';

export type DispatchDecision =
  | { kind: 'ALLOW' }
  | { kind: 'OVERRIDE' }
  | { kind: 'DENY_BALANCE'; balanceUsd: string }
  | { kind: 'INVALID_STATUS'; message: string };

export interface DispatchContext {
  status: OrderStatus;
  dispatchLocked: boolean;
  balanceUsd: string;
  canOverride: boolean;
  overrideReason?: string;
}

/**
 * Solo se despacha desde READY. BR-003: con saldo pendiente solo se
 * despacha vía override, que exige permiso y motivo no vacío; el override
 * no salta la validación de estado.
 */
export function evaluateDispatch(ctx: DispatchContext): DispatchDecision {
  if (ctx.status === 'DISPATCHED') {
    return { kind: 'INVALID_STATUS', message: 'El pedido ya fue despachado' };
  }
  if (ctx.status === 'CANCELLED') {
    return { kind: 'INVALID_STATUS', message: 'No se puede despachar un pedido cancelado' };
  }
  if (ctx.status !== 'READY') {
    return {
      kind: 'INVALID_STATUS',
      message: `Solo se despachan pedidos en estado READY (actual: ${ctx.status})`,
    };
  }
  if (!ctx.dispatchLocked) return { kind: 'ALLOW' };
  if (ctx.canOverride && ctx.overrideReason?.trim()) return { kind: 'OVERRIDE' };
  return { kind: 'DENY_BALANCE', balanceUsd: ctx.balanceUsd };
}
