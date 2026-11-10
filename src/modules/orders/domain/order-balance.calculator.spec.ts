import { computeOrderBalance, paymentExceedsBalance } from './order-balance.calculator';

describe('paymentExceedsBalance', () => {
  it('acepta pago parcial o exacto', () => {
    expect(paymentExceedsBalance('65.8112', '30')).toBe(false);
    expect(paymentExceedsBalance('65.8112', '65.8112')).toBe(false);
  });

  it('tolera excedente de redondeo menor a $0.01', () => {
    expect(paymentExceedsBalance('65.8112', '65.82')).toBe(false);
  });

  it('rechaza sobrepago desde $0.01', () => {
    expect(paymentExceedsBalance('65.8112', '65.8212')).toBe(true);
    expect(paymentExceedsBalance('65.8112', '100')).toBe(true);
  });

  it('con saldo cero o negativo rechaza cualquier pago', () => {
    expect(paymentExceedsBalance('0', '1')).toBe(true);
    expect(paymentExceedsBalance('-20', '5')).toBe(true);
  });
});

describe('computeOrderBalance (BR-003)', () => {
  it('bloquea con saldo pendiente', () => {
    expect(computeOrderBalance('5000', '2000')).toEqual({
      totalUsd: '5000', paidUsd: '2000', balanceUsd: '3000', dispatchLocked: true,
    });
  });

  it('desbloquea con saldo cero', () => {
    expect(computeOrderBalance('5000.0000', '5000').dispatchLocked).toBe(false);
  });

  it('el umbral es exactamente $0.01', () => {
    expect(computeOrderBalance('100', '99.99').dispatchLocked).toBe(true);
    expect(computeOrderBalance('100', '99.9901').dispatchLocked).toBe(false);
  });

  it('sobrepago deja balance negativo y no bloquea', () => {
    const b = computeOrderBalance('100', '120');
    expect(b.balanceUsd).toBe('-20');
    expect(b.dispatchLocked).toBe(false);
  });

  it('suma sin error de coma flotante', () => {
    expect(computeOrderBalance('0.3', '0.1').balanceUsd).toBe('0.2');
  });
});
