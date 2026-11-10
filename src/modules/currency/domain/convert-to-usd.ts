import { Decimal } from 'decimal.js';

export type ConversionResult =
  | { ok: true; amount: string; amountUsd: string; rate: string | null }
  | { ok: false; error: string };

/**
 * Convierte un pago a USD (BR-004). `rateToUsd` = unidades de `currency`
 * por 1 USD (ej. 60.5 DOP). Obligatoria si la moneda no es USD.
 */
export function convertToUsd(
  amount: string,
  currency: string,
  rateToUsd?: string | null,
): ConversionResult {
  const value = safeDecimal(amount);
  if (!value || value.lte(0)) {
    return { ok: false, error: 'El monto debe ser positivo' };
  }
  if (currency === 'USD') {
    return { ok: true, amount: value.toString(), amountUsd: value.toDecimalPlaces(4).toString(), rate: null };
  }
  if (!rateToUsd) {
    return { ok: false, error: 'Se requiere exchangeRateToUsd para pagos en moneda local' };
  }
  const rate = safeDecimal(rateToUsd);
  if (!rate || rate.lte(0)) {
    return { ok: false, error: 'Tasa de cambio invalida' };
  }
  return {
    ok: true,
    amount: value.toString(),
    amountUsd: value.div(rate).toDecimalPlaces(4).toString(),
    rate: rate.toString(),
  };
}

function safeDecimal(raw: string): Decimal | null {
  try {
    const d = new Decimal(raw);
    return d.isFinite() ? d : null;
  } catch {
    return null;
  }
}
