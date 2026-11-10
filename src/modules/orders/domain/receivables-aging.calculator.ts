import { Decimal } from 'decimal.js';

export type AgingBucket = 'CURRENT' | 'DAYS_31_60' | 'DAYS_61_90' | 'OVER_90';

export const AGING_BUCKETS: AgingBucket[] = ['CURRENT', 'DAYS_31_60', 'DAYS_61_90', 'OVER_90'];

export interface ReceivableInput {
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  balanceUsd: string;
  /** Fecha desde la que corre la antigüedad (creación del pedido). */
  since: Date;
}

export interface AgedReceivable extends ReceivableInput {
  days: number;
  bucket: AgingBucket;
}

export interface AgingReport {
  asOf: string;
  totals: Record<AgingBucket, string> & { total: string };
  items: AgedReceivable[];
}

const DAY_MS = 86_400_000;

export function bucketFor(days: number): AgingBucket {
  if (days <= 30) return 'CURRENT';
  if (days <= 60) return 'DAYS_31_60';
  if (days <= 90) return 'DAYS_61_90';
  return 'OVER_90';
}

/** Reporte de antigüedad CxC (M7). Ignora saldos < $0.01. */
export function buildAgingReport(receivables: ReceivableInput[], asOf: Date): AgingReport {
  const sums = new Map<AgingBucket, Decimal>(AGING_BUCKETS.map((b) => [b, new Decimal(0)]));
  const items: AgedReceivable[] = [];

  for (const r of receivables) {
    const balance = new Decimal(r.balanceUsd);
    if (balance.lt('0.01')) continue;
    const days = Math.max(0, Math.floor((asOf.getTime() - r.since.getTime()) / DAY_MS));
    const bucket = bucketFor(days);
    sums.set(bucket, sums.get(bucket)!.plus(balance));
    items.push({ ...r, days, bucket });
  }

  items.sort((a, b) => b.days - a.days);
  const total = AGING_BUCKETS.reduce((acc, b) => acc.plus(sums.get(b)!), new Decimal(0));

  return {
    asOf: asOf.toISOString().slice(0, 10),
    totals: {
      CURRENT: sums.get('CURRENT')!.toString(),
      DAYS_31_60: sums.get('DAYS_31_60')!.toString(),
      DAYS_61_90: sums.get('DAYS_61_90')!.toString(),
      OVER_90: sums.get('OVER_90')!.toString(),
      total: total.toString(),
    },
    items,
  };
}
