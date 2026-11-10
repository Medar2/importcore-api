import type { ECfType, TaxIdType } from './dgii-catalogs';

const ENCF_SEQ_DIGITS = 10;
const ENCF_RE = /^E(3[1-4]|4[1-7])\d{10}$/;
/** NCF tradicional (papel) que todavía reciben las compras a terceros. */
const NCF_RE = /^B(0[1-4]|1[1-7])\d{8}$/;

/** e-NCF: "E" + tipo (2) + secuencial (10) = 13 caracteres. */
export function formatEncf(type: ECfType, sequence: number | bigint): string {
  const seq = String(sequence);
  if (!/^\d+$/.test(seq) || seq.length > ENCF_SEQ_DIGITS || /^0+$/.test(seq)) {
    throw new Error(`Secuencial e-NCF invalido: ${seq}`);
  }
  return `E${type}${seq.padStart(ENCF_SEQ_DIGITS, '0')}`;
}

export const isValidEncf = (value: string): boolean => ENCF_RE.test(value);

/** Acepta e-NCF o NCF tradicional (compras a proveedores locales, 606). */
export const isValidNcf = (value: string): boolean =>
  ENCF_RE.test(value) || NCF_RE.test(value);

export interface BuyerProfile {
  taxId: string | null;
  customerType: 'NACIONAL' | 'EXTRANJERO' | 'GUBERNAMENTAL';
}

/**
 * Tipo de e-CF por defecto para una venta: gubernamental → 45; cliente con
 * RNC (9 dígitos) → 31 crédito fiscal; resto → 32 consumo.
 */
export function defaultSaleEcfType(buyer: BuyerProfile): ECfType {
  if (buyer.customerType === 'GUBERNAMENTAL') return '45';
  const digits = buyer.taxId?.replace(/\D/g, '') ?? '';
  return digits.length === 9 ? '31' : '32';
}

/** Tipo de identificación DGII según la longitud del documento. */
export function taxIdTypeOf(taxId: string): TaxIdType {
  const digits = taxId.replace(/\D/g, '');
  if (digits.length === 9) return '1';
  if (digits.length === 11) return '2';
  return '3';
}

/** Crédito fiscal (31), regímenes especiales (44) y gubernamental (45) exigen RNC/cédula. */
export function requiresBuyerTaxId(type: ECfType): boolean {
  return type === '31' || type === '45' || type === '44';
}
