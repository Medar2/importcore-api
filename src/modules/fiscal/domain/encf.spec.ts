import {
  defaultSaleEcfType,
  formatEncf,
  isValidEncf,
  isValidNcf,
  requiresBuyerTaxId,
  taxIdTypeOf,
} from './encf';

describe('e-NCF', () => {
  it('formatea a 13 caracteres', () => {
    expect(formatEncf('31', 1)).toBe('E310000000001');
    expect(formatEncf('32', 9999999999)).toBe('E329999999999');
    expect(formatEncf('31', 1).length).toBe(13);
  });

  it('rechaza secuencial cero, negativo o de más de 10 dígitos', () => {
    expect(() => formatEncf('31', 0)).toThrow();
    expect(() => formatEncf('31', -1)).toThrow();
    expect(() => formatEncf('31', 10_000_000_000)).toThrow();
  });

  it('valida e-NCF y NCF tradicional', () => {
    expect(isValidEncf('E310000000001')).toBe(true);
    expect(isValidEncf('E350000000001')).toBe(false);
    expect(isValidEncf('B0100000001')).toBe(false);
    expect(isValidNcf('B0100000001')).toBe(true);
    expect(isValidNcf('B1300000123')).toBe(true);
    expect(isValidNcf('B0500000001')).toBe(false);
    expect(isValidNcf('E310000000001')).toBe(true);
  });

  it('elige tipo por perfil del comprador', () => {
    expect(defaultSaleEcfType({ taxId: '1-30-12345-6', customerType: 'NACIONAL' })).toBe('31');
    expect(defaultSaleEcfType({ taxId: '00112345678', customerType: 'NACIONAL' })).toBe('32');
    expect(defaultSaleEcfType({ taxId: null, customerType: 'EXTRANJERO' })).toBe('32');
    expect(defaultSaleEcfType({ taxId: '130123456', customerType: 'GUBERNAMENTAL' })).toBe('45');
  });

  it('tipo de identificación por longitud', () => {
    expect(taxIdTypeOf('130-12345-6')).toBe('1');
    expect(taxIdTypeOf('001-1234567-8')).toBe('2');
    expect(taxIdTypeOf('AB123456')).toBe('3');
  });

  it('31/44/45 exigen identificación del comprador; 32 no', () => {
    expect(requiresBuyerTaxId('31')).toBe(true);
    expect(requiresBuyerTaxId('45')).toBe(true);
    expect(requiresBuyerTaxId('32')).toBe(false);
  });
});
