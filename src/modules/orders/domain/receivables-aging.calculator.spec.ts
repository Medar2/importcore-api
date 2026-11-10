import { bucketFor, buildAgingReport } from './receivables-aging.calculator';
import type { ReceivableInput } from './receivables-aging.calculator';

const asOf = new Date('2026-11-08T12:00:00Z');
const daysAgo = (d: number) => new Date(asOf.getTime() - d * 86_400_000);

function rec(id: string, balanceUsd: string, age: number): ReceivableInput {
  return {
    orderId: id, orderNumber: `OD-${id}`, customerId: 'c1', customerName: 'Cliente',
    balanceUsd, since: daysAgo(age),
  };
}

describe('receivables aging (M7)', () => {
  it('asigna tramos en los bordes 30/60/90', () => {
    expect(bucketFor(0)).toBe('CURRENT');
    expect(bucketFor(30)).toBe('CURRENT');
    expect(bucketFor(31)).toBe('DAYS_31_60');
    expect(bucketFor(60)).toBe('DAYS_31_60');
    expect(bucketFor(61)).toBe('DAYS_61_90');
    expect(bucketFor(90)).toBe('DAYS_61_90');
    expect(bucketFor(91)).toBe('OVER_90');
  });

  it('suma por tramo y total con Decimal', () => {
    const r = buildAgingReport(
      [rec('1', '100.10', 5), rec('2', '0.20', 10), rec('3', '500', 45), rec('4', '1000', 120)],
      asOf,
    );
    expect(r.totals).toEqual({
      CURRENT: '100.3', DAYS_31_60: '500', DAYS_61_90: '0', OVER_90: '1000', total: '1600.3',
    });
    expect(r.asOf).toBe('2026-11-08');
  });

  it('excluye saldos cero, negativos o menores a $0.01', () => {
    const r = buildAgingReport([rec('1', '0', 5), rec('2', '-10', 5), rec('3', '0.009', 5)], asOf);
    expect(r.items).toHaveLength(0);
    expect(r.totals.total).toBe('0');
  });

  it('ordena del más antiguo al más reciente', () => {
    const r = buildAgingReport([rec('a', '1', 5), rec('b', '1', 95), rec('c', '1', 40)], asOf);
    expect(r.items.map((i) => i.orderId)).toEqual(['b', 'c', 'a']);
  });
});
