import { buildPaymentBreakdown, computeInvoiceAmounts } from './invoice-amounts.calculator';

describe('computeInvoiceAmounts', () => {
  it('desglosa ITBIS incluido en el precio', () => {
    expect(
      computeInvoiceAmounts({ totalUsd: '1000', exchangeRate: '59', pricesIncludeItbis: true }),
    ).toEqual({
      exchangeRate: '59', itbisRate: '0.18',
      subtotalDop: '50000.00', itbisDop: '9000.00', totalDop: '59000.00',
    });
  });

  it('agrega ITBIS cuando el precio no lo incluye', () => {
    const r = computeInvoiceAmounts({ totalUsd: '1000', exchangeRate: '60.5', pricesIncludeItbis: false });
    expect(r).toMatchObject({ subtotalDop: '60500.00', itbisDop: '10890.00', totalDop: '71390.00' });
  });

  it('subtotal + ITBIS siempre cuadra con el total (sin centavos perdidos)', () => {
    const r = computeInvoiceAmounts({ totalUsd: '123.4567', exchangeRate: '60.37', pricesIncludeItbis: true });
    expect(Number(r.subtotalDop) * 100 + Number(r.itbisDop) * 100).toBe(Number(r.totalDop) * 100);
    expect(r.totalDop).toBe('7453.08');
  });

  it('acepta tasa de ITBIS exenta (0)', () => {
    const r = computeInvoiceAmounts({ totalUsd: '10', exchangeRate: '60', itbisRate: '0', pricesIncludeItbis: true });
    expect(r).toMatchObject({ subtotalDop: '600.00', itbisDop: '0.00', totalDop: '600.00' });
  });

  it('rechaza tasa de cambio, ITBIS o total inválidos', () => {
    expect(() => computeInvoiceAmounts({ totalUsd: '10', exchangeRate: '0', pricesIncludeItbis: true })).toThrow();
    expect(() => computeInvoiceAmounts({ totalUsd: '10', exchangeRate: '60', itbisRate: '1.5', pricesIncludeItbis: true })).toThrow();
    expect(() => computeInvoiceAmounts({ totalUsd: '0', exchangeRate: '60', pricesIncludeItbis: true })).toThrow();
  });
});

describe('buildPaymentBreakdown', () => {
  it('reparte cobros y deja el resto como crédito', () => {
    expect(
      buildPaymentBreakdown('1000', [
        { form: 'cash', amountDop: '200' },
        { form: 'transfer', amountDop: '300' },
      ]),
    ).toEqual({ cash: '200.00', transfer: '300.00', card: '0.00', credit: '500.00' });
  });

  it('topa el sobrepago al total', () => {
    expect(
      buildPaymentBreakdown('1000', [
        { form: 'transfer', amountDop: '800' },
        { form: 'card', amountDop: '500' },
      ]),
    ).toEqual({ cash: '0.00', transfer: '800.00', card: '200.00', credit: '0.00' });
  });
});
