import { Decimal } from 'decimal.js'

/** Base de prorrateo segun spec M3: peso, volumen CBM o valor CIF. */
export type ProrationBasis = 'WEIGHT' | 'CBM' | 'VALUE'

/**
 * Prorratea un gasto compartido del contenedor (flete, seguro,
 * gastos terminales, comisiones bancarias) a una orden.
 *
 * share = parte de la orden; total = capacidad total del contenedor.
 * Devuelve Decimal para no perder precision.
 */
export function prorate(
  totalAmount: Decimal.Value,
  share: Decimal.Value,
  total: Decimal.Value,
): Decimal {
  const t = new Decimal(total)
  if (t.lte(0)) {
    throw new Error('Proration total must be greater than 0')
  }
  return new Decimal(totalAmount).mul(share).div(t)
}

/** Flete prorrateado por volumen CBM (default maritimo, BR-002). */
export function prorateByCbm(
  containerFreight: Decimal.Value,
  orderCbm: Decimal.Value,
  containerUsableCbm: Decimal.Value,
): Decimal {
  return prorate(containerFreight, orderCbm, containerUsableCbm)
}

/** Gastos prorrateados por peso bruto. */
export function prorateByWeight(
  totalAmount: Decimal.Value,
  orderWeightKg: Decimal.Value,
  containerPayloadKg: Decimal.Value,
): Decimal {
  return prorate(totalAmount, orderWeightKg, containerPayloadKg)
}

/** Seguro/comisiones prorrateados por valor CIF. */
export function prorateByValue(
  totalAmount: Decimal.Value,
  orderCif: Decimal.Value,
  containerCifTotal: Decimal.Value,
): Decimal {
  return prorate(totalAmount, orderCif, containerCifTotal)
}
