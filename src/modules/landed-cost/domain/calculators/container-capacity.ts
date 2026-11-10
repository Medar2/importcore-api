export type ContainerType = '20_ST' | '40_ST' | '40_HC' | 'LCL'

export interface ContainerSpec {
  type: ContainerType
  usableCbm: number
  maxPayloadKg: number
}

/** Capacidades útiles segun BR-002 de la especificacion. */
export const CONTAINER_SPECS: Record<ContainerType, ContainerSpec> = {
  '20_ST': { type: '20_ST', usableCbm: 28.0, maxPayloadKg: 21500 },
  '40_ST': { type: '40_ST', usableCbm: 58.0, maxPayloadKg: 26000 },
  '40_HC': { type: '40_HC', usableCbm: 68.0, maxPayloadKg: 26000 },
  LCL: { type: 'LCL', usableCbm: Number.POSITIVE_INFINITY, maxPayloadKg: Number.POSITIVE_INFINITY },
}

const FCL_ORDER: ContainerType[] = ['20_ST', '40_ST', '40_HC']

/**
 * Recomienda el contenedor FCL mas pequeno que aloje el volumen y peso,
 * o LCL si la carga es insuficiente para justificar FCL.
 */
export function recommendContainer(
  totalCbm: number,
  totalWeightKg: number,
): ContainerType {
  for (const type of FCL_ORDER) {
    const spec = CONTAINER_SPECS[type]
    if (totalCbm <= spec.usableCbm && totalWeightKg <= spec.maxPayloadKg) {
      return type
    }
  }
  return 'LCL'
}

/** Indica si la carga cabe en un FCL o requiere LCL / multiples contenedores. */
export function fitsSingleFcl(totalCbm: number, totalWeightKg: number): boolean {
  const hc = CONTAINER_SPECS['40_HC']
  return totalCbm <= hc.usableCbm && totalWeightKg <= hc.maxPayloadKg
}
