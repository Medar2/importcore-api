import { convertToUsd } from './convert-to-usd';

describe('convertToUsd (BR-004)', () => {
  it('USD pasa sin tasa', () => {
    expect(convertToUsd('100.5', 'USD')).toEqual({
      ok: true, amount: '100.5', amountUsd: '100.5', rate: null,
    });
  });

  it('DOP divide por la tasa y conserva la tasa usada', () => {
    expect(convertToUsd('181500', 'DOP', '60.5')).toEqual({
      ok: true, amount: '181500', amountUsd: '3000', rate: '60.5',
    });
  });

  it('redondea a 4 decimales sin error de coma flotante', () => {
    const r = convertToUsd('100', 'CNY', '7.3');
    expect(r.ok && r.amountUsd).toBe('13.6986');
  });

  it('exige tasa para moneda distinta de USD', () => {
    expect(convertToUsd('100', 'DOP')).toEqual({
      ok: false, error: 'Se requiere exchangeRateToUsd para pagos en moneda local',
    });
  });

  it.each(['0', '-5', 'abc', ''])('rechaza monto inválido %p', (amount) => {
    expect(convertToUsd(amount, 'USD').ok).toBe(false);
  });

  it.each(['0', '-1', 'x'])('rechaza tasa inválida %p', (rate) => {
    expect(convertToUsd('100', 'DOP', rate)).toEqual({ ok: false, error: 'Tasa de cambio invalida' });
  });
});
