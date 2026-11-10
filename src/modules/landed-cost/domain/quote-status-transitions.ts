import type { QuoteStatus } from '../entities/quote.entity';

export type QuoteManualStatus = Exclude<QuoteStatus, 'CONVERTED'>;

const ALLOWED: Record<QuoteManualStatus, QuoteManualStatus[]> = {
  DRAFT: ['SENT'],
  SENT: ['ACCEPTED', 'REJECTED'],
  ACCEPTED: [],
  REJECTED: [],
};

/** CONVERTED solo se asigna al crear un pedido desde la cotizacion. */
export function canTransitionQuote(from: QuoteStatus, to: QuoteStatus): boolean {
  if (to === 'CONVERTED') return false;
  return (ALLOWED[from as QuoteManualStatus] ?? []).includes(to as QuoteManualStatus);
}

export function assertQuoteTransition(from: QuoteStatus, to: QuoteStatus): void {
  if (!canTransitionQuote(from, to)) {
    throw new Error(`Transicion invalida ${from} → ${to}`);
  }
}
