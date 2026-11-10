import { Decimal } from 'decimal.js';

/** BR-003: saldo mínimo que bloquea el despacho. */
export const DISPATCH_LOCK_THRESHOLD_USD = '0.01';

export interface OrderBalance {
  totalUsd: string;
  paidUsd: string;
  balanceUsd: string;
  /** BR-003: true si balance >= 0.01 -> despacho bloqueado. */
  dispatchLocked: boolean;
}

export function computeOrderBalance(
  totalUsd: string,
  paidUsd: string | number,
): OrderBalance {
  const total = new Decimal(totalUsd);
  const paid = new Decimal(paidUsd);
  const balance = total.minus(paid);
  return {
    totalUsd: total.toString(),
    paidUsd: paid.toString(),
    balanceUsd: balance.toString(),
    dispatchLocked: balance.gte(DISPATCH_LOCK_THRESHOLD_USD),
  };
}

/**
 * Un pago no puede superar el saldo pendiente. Se tolera un excedente
 * menor a $0.01 por redondeo de conversión de moneda (BR-004).
 */
export function paymentExceedsBalance(
  balanceUsd: string,
  amountUsd: string,
): boolean {
  const excess = new Decimal(amountUsd).minus(Decimal.max(balanceUsd, 0));
  return excess.gte(DISPATCH_LOCK_THRESHOLD_USD);
}
