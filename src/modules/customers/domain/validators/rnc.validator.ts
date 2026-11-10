/**
 * Validador de RNC/cédula fiscal dominicana — algoritmo modulo 11 DGII.
 *
 * Soporta:
 * - RNC de empresa: 9 digitos (ej. 1-30-12345-6)
 * - Cédula usada como RNC: 11 digitos
 *
 * Pesos mod11: [7,9,8,6,5,4,3,2] ciclando sobre los digitos base.
 */
const WEIGHTS = [7, 9, 8, 6, 5, 4, 3, 2];

function mod11CheckDigit(digits: number[]): number {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    sum += digits[i] * WEIGHTS[i % WEIGHTS.length];
  }
  const remainder = sum % 11;
  return remainder === 0 ? 2 : remainder === 1 ? 1 : 11 - remainder;
}

export function validateRnc(rnc: string): boolean {
  if (!rnc || typeof rnc !== 'string') return false;
  const clean = rnc.replace(/[^\d]/g, '');
  if (clean.length !== 9 && clean.length !== 11) return false;
  if (/^0+$/.test(clean)) return false;

  const base = clean.slice(0, -1).split('').map(Number);
  const check = Number(clean.slice(-1));
  return mod11CheckDigit(base) === check;
}

/** Normaliza RNC a solo digitos para almacenamiento/comparacion. */
export function normalizeRnc(rnc: string): string {
  return rnc.replace(/[^\d]/g, '');
}
