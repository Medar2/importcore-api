import { SECRET_MASK, isSecretKey, maskConfig, withoutMaskedValue } from './secret-config';

describe('secret-config', () => {
  it('detecta claves secretas por segmento', () => {
    expect(isSecretKey('EMAIL.PASS')).toBe(true);
    expect(isSecretKey('ECF.API_KEY')).toBe(true);
    expect(isSecretKey('JWT_SECRET')).toBe(true);
    expect(isSecretKey('ECF.TOKEN')).toBe(true);
    expect(isSecretKey('EMAIL.HOST')).toBe(false);
    expect(isSecretKey('FISCAL.COMPANY_RNC')).toBe(false);
    expect(isSecretKey('PASSPORT.ENABLED')).toBe(false);
  });

  it('enmascara secretos con valor y deja visibles los demás', () => {
    expect(maskConfig({ key: 'EMAIL.PASS', value: 'abc' })).toEqual({
      key: 'EMAIL.PASS', value: SECRET_MASK, isSecret: true, hasValue: true,
    });
    expect(maskConfig({ key: 'EMAIL.PASS', value: '' })).toMatchObject({ value: '', hasValue: false });
    expect(maskConfig({ key: 'EMAIL.HOST', value: 'smtp' })).toMatchObject({ value: 'smtp', isSecret: false });
  });

  it('descarta la máscara devuelta por el cliente', () => {
    expect(withoutMaskedValue({ value: SECRET_MASK, group: 'EMAIL' })).toEqual({ group: 'EMAIL' });
    expect(withoutMaskedValue({ value: 'nuevo' })).toEqual({ value: 'nuevo' });
  });
});
