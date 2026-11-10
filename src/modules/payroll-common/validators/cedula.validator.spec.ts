import { validateCedula } from './cedula.validator';

describe('validateCedula', () => {
  // ─── Cédulas válidas ──────────────────────────────────────────────────────
  describe('cédulas válidas', () => {
    it('debería aceptar cédula válida 00113918205', () => {
      expect(validateCedula('00113918205')).toBe(true);
    });

    it('debería aceptar segunda cédula válida 00113918205 (misma, variante diferente)', () => {
      // Cédulas válidas verificadas con el algoritmo JCE
      // 001-1391820-5: sum=25, check=(10-5)%10=5 ✓
      expect(validateCedula('00113918205')).toBe(true);
    });

    it('debería aceptar cédula con guiones formateados (001-1391820-5)', () => {
      // El validador normaliza guiones antes de procesar
      expect(validateCedula('001-1391820-5')).toBe(true);
    });

    it('NO debería aceptar cédula con espacios (el validator solo normaliza guiones)', () => {
      // Comportamiento documentado: solo se normalizan guiones (-), no espacios
      expect(validateCedula('001 1391820 5')).toBe(false);
    });
  });

  // ─── Longitud incorrecta ──────────────────────────────────────────────────
  describe('longitud incorrecta', () => {
    it('debería rechazar cédula de menos de 11 dígitos', () => {
      expect(validateCedula('0011391820')).toBe(false);
    });

    it('debería rechazar cédula de más de 11 dígitos', () => {
      expect(validateCedula('001139182050')).toBe(false);
    });

    it('debería rechazar cédula vacía', () => {
      expect(validateCedula('')).toBe(false);
    });
  });

  // ─── Caracteres inválidos ─────────────────────────────────────────────────
  describe('caracteres inválidos', () => {
    it('debería rechazar cédula con letras', () => {
      expect(validateCedula('0011391820A')).toBe(false);
    });

    it('debería rechazar cédula con caracteres especiales (excl. guiones y espacios)', () => {
      expect(validateCedula('001139182#5')).toBe(false);
    });
  });

  // ─── Dígito verificador incorrecto ────────────────────────────────────────
  describe('dígito verificador incorrecto', () => {
    it('debería rechazar cédula con dígito verificador incorrecto (último dígito +1)', () => {
      // 00113918205 es válida; cambiar el último dígito debe fallar
      expect(validateCedula('00113918206')).toBe(false);
    });

    it('debería rechazar cédula con dígito verificador incorrecto (último dígito 0)', () => {
      expect(validateCedula('00113918200')).toBe(false);
    });

    it('debería rechazar secuencia de ceros', () => {
      expect(validateCedula('00000000000')).toBe(false);
    });
  });

  // ─── Valores nulos / undefined ────────────────────────────────────────────
  describe('valores nulos o undefined', () => {
    it('debería rechazar null', () => {
      expect(validateCedula(null as any)).toBe(false);
    });

    it('debería rechazar undefined', () => {
      expect(validateCedula(undefined as any)).toBe(false);
    });
  });
});
