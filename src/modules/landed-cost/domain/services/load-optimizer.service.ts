import { Decimal } from 'decimal.js';
import {
  CONTAINER_SPECS,
  ContainerType,
} from '../calculators/container-capacity';

export interface LoadOptimization {
  containerType: ContainerType;
  containerCount: number;
  /** % de utilizacion CBM del ultimo calculo consolidado (0-100). */
  cbmUtilizationPct: string;
  weightUtilizationPct: string;
  fitsSingleFcl: boolean;
}

const FCL_TYPES: ContainerType[] = ['20_ST', '40_ST', '40_HC'];

/**
 * Optimizador CBM/peso (M4, BR-002): para cada tipo FCL calcula cuantos
 * contenedores hacen falta y elige la combinacion mas eficiente
 * (menor numero de contenedores; desempate: menor tamano).
 */
export function optimizeLoad(
  totalCbm: Decimal.Value,
  totalWeightKg: Decimal.Value,
): LoadOptimization {
  const cbm = new Decimal(totalCbm);
  const kg = new Decimal(totalWeightKg);

  let best: LoadOptimization | null = null;
  for (const type of FCL_TYPES) {
    const spec = CONTAINER_SPECS[type];
    const byCbm = cbm.div(spec.usableCbm).ceil();
    const byWeight = kg.div(spec.maxPayloadKg).ceil();
    const count = Decimal.max(byCbm, byWeight).toNumber();
    if (!Number.isFinite(count) || count <= 0) continue;

    const utilCbm = cbm.div(new Decimal(spec.usableCbm).mul(count)).mul(100);
    const utilKg = kg.div(new Decimal(spec.maxPayloadKg).mul(count)).mul(100);
    const candidate: LoadOptimization = {
      containerType: type,
      containerCount: count,
      cbmUtilizationPct: utilCbm.toDecimalPlaces(2).toString(),
      weightUtilizationPct: utilKg.toDecimalPlaces(2).toString(),
      fitsSingleFcl: count === 1,
    };

    if (
      !best ||
      candidate.containerCount < best.containerCount ||
      (candidate.containerCount === best.containerCount &&
        FCL_TYPES.indexOf(type) < FCL_TYPES.indexOf(best.containerType))
    ) {
      best = candidate;
    }
  }

  if (!best) {
    return {
      containerType: 'LCL',
      containerCount: 1,
      cbmUtilizationPct: '0',
      weightUtilizationPct: '0',
      fitsSingleFcl: false,
    };
  }
  return best;
}
