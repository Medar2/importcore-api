import { Decimal } from 'decimal.js';

export const DEFAULT_ITBIS_RATE = '0.18';

export interface InvoiceAmountsInput {
  totalUsd: string;
  /** DOP por 1 USD. */
  exchangeRate: string;
  itbisRate?: string;
  /** true: el total del pedido ya incluye ITBIS (precio final al cliente). */
  pricesIncludeItbis: boolean;
}

export interface InvoiceAmounts {
  exchangeRate: string;
  itbisRate: string;
  subtotalDop: string;
  itbisDop: string;
  totalDop: string;
}

const money = (d: Decimal) => d.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

/** Montos en DOP del comprobante de venta (BR-004 / BR-005). */
export function computeInvoiceAmounts(input: InvoiceAmountsInput): InvoiceAmounts {
  const rate = new Decimal(input.exchangeRate);
  const itbisRate = new Decimal(input.itbisRate ?? DEFAULT_ITBIS_RATE);
  if (!rate.isFinite() || rate.lte(0)) throw new Error('Tasa de cambio invalida');
  if (itbisRate.isNeg() || itbisRate.gte(1)) throw new Error('Tasa de ITBIS invalida');

  const grossDop = money(new Decimal(input.totalUsd).mul(rate));
  if (grossDop.lte(0)) throw new Error('El total del comprobante debe ser positivo');

  let subtotal: Decimal;
  let itbis: Decimal;
  if (input.pricesIncludeItbis) {
    subtotal = money(grossDop.div(itbisRate.plus(1)));
    itbis = grossDop.minus(subtotal);
  } else {
    subtotal = grossDop;
    itbis = money(grossDop.mul(itbisRate));
  }

  return {
    exchangeRate: rate.toString(),
    itbisRate: itbisRate.toString(),
    subtotalDop: subtotal.toFixed(2),
    itbisDop: itbis.toFixed(2),
    totalDop: subtotal.plus(itbis).toFixed(2),
  };
}

export type SalePaymentForm = 'cash' | 'transfer' | 'card' | 'credit';

export interface PaymentBreakdown {
  cash: string;
  transfer: string;
  card: string;
  credit: string;
}

/**
 * Formas de cobro del 607 en DOP. Lo no cobrado al emitir va a "venta a
 * crédito"; el sobrepago no se reparte (se topa al total).
 */
export function buildPaymentBreakdown(
  totalDop: string,
  paymentsDop: { form: Exclude<SalePaymentForm, 'credit'>; amountDop: string }[],
): PaymentBreakdown {
  const total = new Decimal(totalDop);
  const sums = { cash: new Decimal(0), transfer: new Decimal(0), card: new Decimal(0) };
  let remaining = total;

  for (const p of paymentsDop) {
    const take = Decimal.min(new Decimal(p.amountDop), remaining);
    if (take.lte(0)) continue;
    sums[p.form] = sums[p.form].plus(take);
    remaining = remaining.minus(take);
  }

  return {
    cash: money(sums.cash).toFixed(2),
    transfer: money(sums.transfer).toFixed(2),
    card: money(sums.card).toFixed(2),
    credit: money(remaining).toFixed(2),
  };
}
