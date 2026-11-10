import { Decimal } from 'decimal.js'

/**
 * Evaluacion arancelaria DGA segun BR-001.
 * Todos los montos y tasas usan Decimal (prohibido float en dinero).
 */
export interface CustomsRates {
  /** Tasa de gravamen ad-valorem (ej. 0.20 = 20%). */
  gravamenRate: Decimal.Value
  /** Tasa ITBIS (default 0.18). */
  itbisRate?: Decimal.Value
  /** Tasa selectivo al consumo si aplica (default 0). */
  selectivoRate?: Decimal.Value
}

export interface CustomsAssessment {
  fob: Decimal
  freight: Decimal
  insurance: Decimal
  cif: Decimal
  gravamen: Decimal
  selectivo: Decimal
  itbisBase: Decimal
  itbis: Decimal
  /** Costo landed pre-impuesto: CIF + gravamen + gastos locales + comisiones. */
  landedCostPreTax: Decimal
}

const ITBIS_DEFAULT = new Decimal('0.18')
const ZERO = new Decimal(0)

export function computeCif(
  fob: Decimal.Value,
  freight: Decimal.Value,
  insurance: Decimal.Value,
): Decimal {
  return new Decimal(fob).plus(freight).plus(insurance)
}

export function computeGravamen(cif: Decimal.Value, rate: Decimal.Value): Decimal {
  return new Decimal(cif).mul(rate)
}

export function computeSelectivo(
  cif: Decimal.Value,
  gravamen: Decimal.Value,
  rate: Decimal.Value,
): Decimal {
  return new Decimal(cif).plus(gravamen).mul(rate)
}

export function computeItbisBase(
  cif: Decimal.Value,
  gravamen: Decimal.Value,
  selectivo: Decimal.Value,
): Decimal {
  return new Decimal(cif).plus(gravamen).plus(selectivo)
}

export function computeItbis(base: Decimal.Value, rate: Decimal.Value = ITBIS_DEFAULT): Decimal {
  return new Decimal(base).mul(rate)
}

/**
 * Liquidacion completa de una partida arancelaria.
 * localExpenses y bankFees ya deben venir prorrateados a la orden.
 */
export function assessCustomsDuty(input: {
  fob: Decimal.Value
  freight: Decimal.Value
  insurance: Decimal.Value
  rates: CustomsRates
  localExpenses?: Decimal.Value
  bankFees?: Decimal.Value
}): CustomsAssessment {
  const { rates } = input
  const itbisRate = rates.itbisRate ?? ITBIS_DEFAULT
  const selectivoRate = rates.selectivoRate ?? ZERO

  const fob = new Decimal(input.fob)
  const freight = new Decimal(input.freight)
  const insurance = new Decimal(input.insurance)
  const cif = computeCif(fob, freight, insurance)
  const gravamen = computeGravamen(cif, rates.gravamenRate)
  const selectivo = computeSelectivo(cif, gravamen, selectivoRate)
  const itbisBase = computeItbisBase(cif, gravamen, selectivo)
  const itbis = computeItbis(itbisBase, itbisRate)
  const landedCostPreTax = cif
    .plus(gravamen)
    .plus(input.localExpenses ?? 0)
    .plus(input.bankFees ?? 0)

  return { fob, freight, insurance, cif, gravamen, selectivo, itbisBase, itbis, landedCostPreTax }
}
