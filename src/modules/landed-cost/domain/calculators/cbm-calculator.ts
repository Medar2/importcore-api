import { Decimal } from 'decimal.js'

export interface BoxDimensions {
  lengthM: Decimal.Value
  widthM: Decimal.Value
  heightM: Decimal.Value
}

/** CBM de una caja individual: L x W x H (metros). */
export function boxCbm(dims: BoxDimensions): Decimal {
  return new Decimal(dims.lengthM)
    .mul(dims.widthM)
    .mul(dims.heightM)
}

/** CBM por unidad: CBM de caja / unidades por caja. */
export function unitCbm(boxVolume: Decimal.Value, unitsPerBox: number): Decimal {
  if (unitsPerBox <= 0) {
    throw new Error('unitsPerBox must be greater than 0')
  }
  return new Decimal(boxVolume).div(unitsPerBox)
}

/** CBM total de la línea: CBM de caja x número de cajas. */
export function lineCbm(boxVolume: Decimal.Value, boxesCount: number): Decimal {
  if (boxesCount < 0) {
    throw new Error('boxesCount cannot be negative')
  }
  return new Decimal(boxVolume).mul(boxesCount)
}

/** CBM total del pedido: suma de CBM por línea. */
export function orderCbm(lineVolumes: Decimal.Value[]): Decimal {
  return lineVolumes.reduce<Decimal>(
    (acc, v) => acc.plus(v),
    new Decimal(0),
  )
}
