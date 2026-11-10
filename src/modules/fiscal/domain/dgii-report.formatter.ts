import { Decimal } from 'decimal.js';
import { dgiiDate } from './fiscal-period';
import type { TaxIdType } from './dgii-catalogs';

/**
 * Formatos de envío DGII (Norma 07-2018): TXT delimitado por "|", primera
 * línea `<formato>|<RNC>|<AAAAMM>|<cantidad>`, montos con 2 decimales.
 */

export interface Line606 {
  taxId: string;
  taxIdType: TaxIdType;
  goodsServicesType: string;
  ncf: string;
  modifiedNcf?: string | null;
  invoiceDate: string;
  paymentDate?: string | null;
  servicesAmount: string;
  goodsAmount: string;
  itbisBilled: string;
  itbisWithheld?: string;
  itbisProportionality?: string;
  itbisToCost?: string;
  itbisPerceived?: string;
  isrWithholdingType?: string | null;
  isrWithheld?: string;
  isrPerceived?: string;
  selectiveTax?: string;
  otherTaxes?: string;
  legalTip?: string;
  paymentMethod: string;
}

export interface Line607 {
  taxId: string;
  taxIdType: TaxIdType;
  ncf: string;
  modifiedNcf?: string | null;
  incomeType: string;
  invoiceDate: string;
  withholdingDate?: string | null;
  billedAmount: string;
  itbisBilled: string;
  itbisWithheldByThirdParties?: string;
  itbisPerceived?: string;
  isrWithheldByThirdParties?: string;
  isrPerceived?: string;
  selectiveTax?: string;
  otherTaxes?: string;
  legalTip?: string;
  cash: string;
  transfer: string;
  card: string;
  credit: string;
  giftCertificates?: string;
  barter?: string;
  otherForms?: string;
}

export interface Line608 {
  ncf: string;
  invoiceDate: string;
  cancellationType: string;
}

/** Monto opcional: vacío si es cero o no viene. */
function amt(value?: string | null): string {
  if (value === undefined || value === null || value === '') return '';
  const d = new Decimal(value);
  return d.isZero() ? '' : d.toFixed(2);
}

/** Monto obligatorio: siempre con 2 decimales. */
const req = (value: string) => new Decimal(value).toFixed(2);

export function format606Line(l: Line606): string {
  const total = new Decimal(l.servicesAmount).plus(l.goodsAmount);
  const itbisToAdvance = new Decimal(l.itbisBilled)
    .minus(l.itbisProportionality || 0)
    .minus(l.itbisToCost || 0);
  return [
    l.taxId.replace(/\D/g, ''), l.taxIdType, l.goodsServicesType, l.ncf, l.modifiedNcf ?? '',
    dgiiDate(l.invoiceDate), dgiiDate(l.paymentDate),
    req(l.servicesAmount), req(l.goodsAmount), total.toFixed(2),
    req(l.itbisBilled), amt(l.itbisWithheld), amt(l.itbisProportionality), amt(l.itbisToCost),
    amt(itbisToAdvance.toString()), amt(l.itbisPerceived),
    l.isrWithholdingType ?? '', amt(l.isrWithheld), amt(l.isrPerceived),
    amt(l.selectiveTax), amt(l.otherTaxes), amt(l.legalTip), l.paymentMethod,
  ].join('|');
}

export function format607Line(l: Line607): string {
  return [
    l.taxId.replace(/\D/g, ''), l.taxIdType, l.ncf, l.modifiedNcf ?? '', l.incomeType,
    dgiiDate(l.invoiceDate), dgiiDate(l.withholdingDate),
    req(l.billedAmount), req(l.itbisBilled),
    amt(l.itbisWithheldByThirdParties), amt(l.itbisPerceived),
    amt(l.isrWithheldByThirdParties), amt(l.isrPerceived),
    amt(l.selectiveTax), amt(l.otherTaxes), amt(l.legalTip),
    amt(l.cash), amt(l.transfer), amt(l.card), amt(l.credit),
    amt(l.giftCertificates), amt(l.barter), amt(l.otherForms),
  ].join('|');
}

export function format608Line(l: Line608): string {
  return [l.ncf, dgiiDate(l.invoiceDate), l.cancellationType].join('|');
}

export type DgiiFormat = '606' | '607' | '608';

/** Archivo completo: encabezado + detalle, líneas separadas por CRLF. */
export function buildDgiiFile(
  format: DgiiFormat,
  companyRnc: string,
  periodCode: string,
  lines: string[],
): string {
  const rnc = companyRnc.replace(/\D/g, '');
  if (rnc.length !== 9 && rnc.length !== 11) {
    throw new Error('RNC de la empresa invalido para el reporte DGII');
  }
  const header = [format, rnc, periodCode, String(lines.length)].join('|');
  return [header, ...lines].join('\r\n') + '\r\n';
}
