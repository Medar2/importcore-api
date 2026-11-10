import {
  validateAfpNumber,
  validateArsNumber,
  validateNss,
} from './afp-ars.validator';

describe('AFP / ARS / NSS validators', () => {
  // ─── validateAfpNumber ────────────────────────────────────────────────────
  describe('validateAfpNumber', () => {
    it('debería aceptar 11 dígitos numéricos válidos', () => {
      expect(validateAfpNumber('12345678901')).toBe(true);
    });

    it('debería aceptar número con ceros a la izquierda', () => {
      expect(validateAfpNumber('00000000001')).toBe(true);
    });

    it('debería rechazar menos de 11 dígitos', () => {
      expect(validateAfpNumber('1234567890')).toBe(false);
    });

    it('debería rechazar más de 11 dígitos', () => {
      expect(validateAfpNumber('123456789012')).toBe(false);
    });

    it('debería rechazar letras', () => {
      expect(validateAfpNumber('1234567890A')).toBe(false);
    });

    it('debería rechazar cadena vacía', () => {
      expect(validateAfpNumber('')).toBe(false);
    });

    it('debería rechazar null', () => {
      expect(validateAfpNumber(null as any)).toBe(false);
    });

    it('debería rechazar undefined', () => {
      expect(validateAfpNumber(undefined as any)).toBe(false);
    });
  });

  // ─── validateArsNumber ────────────────────────────────────────────────────
  describe('validateArsNumber', () => {
    it('debería aceptar 11 dígitos numéricos válidos', () => {
      expect(validateArsNumber('98765432109')).toBe(true);
    });

    it('debería rechazar menos de 11 dígitos', () => {
      expect(validateArsNumber('9876543210')).toBe(false);
    });

    it('debería rechazar más de 11 dígitos', () => {
      expect(validateArsNumber('987654321098')).toBe(false);
    });

    it('debería rechazar guiones', () => {
      expect(validateArsNumber('98765-432109')).toBe(false);
    });

    it('debería rechazar espacios', () => {
      expect(validateArsNumber('98765 432109')).toBe(false);
    });

    it('debería rechazar null', () => {
      expect(validateArsNumber(null as any)).toBe(false);
    });
  });

  // ─── validateNss ──────────────────────────────────────────────────────────
  describe('validateNss', () => {
    it('debería aceptar NSS de 11 dígitos', () => {
      expect(validateNss('11122233344')).toBe(true);
    });

    it('debería aceptar NSS con ceros a la izquierda', () => {
      expect(validateNss('00011122233')).toBe(true);
    });

    it('debería rechazar NSS de 10 dígitos', () => {
      expect(validateNss('1112223334')).toBe(false);
    });

    it('debería rechazar NSS de 12 dígitos', () => {
      expect(validateNss('111222333445')).toBe(false);
    });

    it('debería rechazar NSS con letras', () => {
      expect(validateNss('1112223334A')).toBe(false);
    });

    it('debería rechazar cadena vacía', () => {
      expect(validateNss('')).toBe(false);
    });

    it('debería rechazar null', () => {
      expect(validateNss(null as any)).toBe(false);
    });
  });
});
