import { Decimal } from 'decimal.js';
import type { ContainerType } from '../../landed-cost/domain/calculators/container-capacity';
import { CONTAINER_SPECS } from '../../landed-cost/domain/calculators/container-capacity';

export interface OccupantInputItem {
  id: string;
  type: 'ORDER' | 'QUOTE';
  reference: string;
  customerId?: string | null;
  customerName?: string | null;
  status: string;
  cbm: number | string;
  weightKg?: number | string;
}

export interface ContainerOccupantDetail extends OccupantInputItem {
  cbm: number;
  weightKg: number;
  cbmSharePercent: number;
  weightSharePercent: number;
}

export interface ContainerOccupancyResult {
  containerType: ContainerType;
  capacityCbm: number;
  capacityKg: number;
  usedCbm: number;
  usedKg: number;
  remainingCbm: number;
  remainingKg: number;
  occupancyCbmPercent: number;
  occupancyKgPercent: number;
  isOverloaded: boolean;
  itemCount: number;
  items: ContainerOccupantDetail[];
}

/**
 * Calcula la ocupación volumétrica y de peso de un contenedor
 * a partir de las cotizaciones y pedidos consolidados.
 */
export function computeContainerOccupancy(
  containerType: ContainerType,
  items: OccupantInputItem[],
): ContainerOccupancyResult {
  const spec = CONTAINER_SPECS[containerType] ?? {
    type: containerType,
    usableCbm: 0,
    maxPayloadKg: 0,
  };
  const capacityCbm = new Decimal(spec.usableCbm);
  const capacityKg = new Decimal(spec.maxPayloadKg);

  let totalCbm = new Decimal(0);
  let totalKg = new Decimal(0);

  const parsedItems = items.map((item) => {
    const itemCbm = new Decimal(item.cbm || 0);
    const itemKg = new Decimal(item.weightKg || 0);
    totalCbm = totalCbm.plus(itemCbm);
    totalKg = totalKg.plus(itemKg);

    const cbmShare =
      capacityCbm.gt(0) && capacityCbm.isFinite()
        ? itemCbm
            .div(capacityCbm)
            .mul(100)
            .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
            .toNumber()
        : 0;

    const weightShare =
      capacityKg.gt(0) && capacityKg.isFinite()
        ? itemKg
            .div(capacityKg)
            .mul(100)
            .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
            .toNumber()
        : 0;

    return {
      ...item,
      cbm: itemCbm.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
      weightKg: itemKg.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
      cbmSharePercent: cbmShare,
      weightSharePercent: weightShare,
    };
  });

  const remainingCbm = capacityCbm.isFinite()
    ? Decimal.max(0, capacityCbm.minus(totalCbm))
        .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
        .toNumber()
    : 0;

  const remainingKg = capacityKg.isFinite()
    ? Decimal.max(0, capacityKg.minus(totalKg))
        .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
        .toNumber()
    : 0;

  const occupancyCbmPercent =
    capacityCbm.gt(0) && capacityCbm.isFinite()
      ? totalCbm
          .div(capacityCbm)
          .mul(100)
          .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
          .toNumber()
      : 0;

  const occupancyKgPercent =
    capacityKg.gt(0) && capacityKg.isFinite()
      ? totalKg
          .div(capacityKg)
          .mul(100)
          .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
          .toNumber()
      : 0;

  const isOverloaded =
    (capacityCbm.isFinite() && totalCbm.gt(capacityCbm)) ||
    (capacityKg.isFinite() && totalKg.gt(capacityKg));

  return {
    containerType,
    capacityCbm: capacityCbm.isFinite() ? capacityCbm.toNumber() : 0,
    capacityKg: capacityKg.isFinite() ? capacityKg.toNumber() : 0,
    usedCbm: totalCbm.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
    usedKg: totalKg.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
    remainingCbm,
    remainingKg,
    occupancyCbmPercent,
    occupancyKgPercent,
    isOverloaded,
    itemCount: parsedItems.length,
    items: parsedItems,
  };
}
