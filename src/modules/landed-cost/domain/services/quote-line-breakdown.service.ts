import { Decimal } from 'decimal.js';
import { boxCbm, lineCbm } from '../calculators/cbm-calculator';
import { assessCustomsDuty } from '../calculators/customs-duty-calculator';
import { ProrationBasis, prorate } from '../calculators/landed-cost-prorater';
import { QuoteItemDto } from '../../presentation/dtos/calculate-landed-cost-request.dto';
import { QuoteItemBreakdown } from '../../presentation/dtos/quote-calculation-result.dto';

export interface PreparedItem {
  dto: QuoteItemDto;
  units: number;
  cbm: Decimal;
  weightKg: Decimal | null;
  fob: Decimal;
}

export interface ProrationContext {
  basis: ProrationBasis;
  usableCbm: Decimal;
  payloadKg: Decimal;
  totalCbm: Decimal;
  totalWeight: Decimal | null;
  totalFob: Decimal;
  freight: Decimal;
  insurance: Decimal;
  localExpenses: Decimal;
  bankFees: Decimal;
  markup: Decimal | null;
}

/** Prepara las lineas del pedido: CBM, peso y FOB en Decimal. */
export function prepareQuoteItems(dtos: QuoteItemDto[]): PreparedItem[] {
  return dtos.map((dto) => {
    const boxVolume = boxCbm({
      lengthM: dto.lengthM,
      widthM: dto.widthM,
      heightM: dto.heightM,
    });
    const cbm = lineCbm(boxVolume, dto.boxesCount);
    const units = dto.boxesCount * dto.unitsPerBox;
    const weightKg = dto.boxGrossWeightKg
      ? new Decimal(dto.boxGrossWeightKg).mul(dto.boxesCount)
      : null;
    return {
      dto,
      units,
      cbm,
      weightKg,
      fob: new Decimal(dto.unitFobPriceUsd).mul(units),
    };
  });
}

export function sumItemWeight(items: PreparedItem[]): Decimal | null {
  if (items.some((i) => i.weightKg === null)) return null;
  return items.reduce((a, i) => a.plus(i.weightKg as Decimal), new Decimal(0));
}

function shareOf(item: PreparedItem, ctx: ProrationContext): Decimal {
  switch (ctx.basis) {
    case 'WEIGHT':
      return prorate(1, item.weightKg ?? 0, ctx.payloadKg);
    case 'VALUE':
      return prorate(1, item.fob, ctx.totalFob);
    case 'CBM':
    default:
      return prorate(1, item.cbm, ctx.usableCbm);
  }
}

/** Liquidacion arancelaria + landed cost de una linea del pedido. */
export function computeQuoteLine(
  item: PreparedItem,
  ctx: ProrationContext,
): QuoteItemBreakdown {
  const share = shareOf(item, ctx);
  const freightShare = ctx.freight.mul(share);
  const insuranceShare = ctx.insurance.mul(share);

  const assessment = assessCustomsDuty({
    fob: item.fob,
    freight: freightShare,
    insurance: insuranceShare,
    rates: {
      gravamenRate: item.dto.rates.gravamenRate,
      itbisRate: item.dto.rates.itbisRate,
      selectivoRate: item.dto.rates.selectivoRate,
    },
    localExpenses: ctx.localExpenses.mul(share),
    bankFees: ctx.bankFees.mul(share),
  });

  const unitLanded =
    item.units > 0 ? assessment.landedCostPreTax.div(item.units) : new Decimal(0);
  const unitCustomer = ctx.markup
    ? unitLanded.mul(new Decimal(1).plus(ctx.markup.div(100)))
    : null;

  return {
    description: item.dto.description,
    units: item.units,
    cbm: item.cbm.toString(),
    fobUsd: item.fob.toString(),
    proratedFreightUsd: freightShare.toString(),
    proratedInsuranceUsd: insuranceShare.toString(),
    cifUsd: assessment.cif.toString(),
    gravamenUsd: assessment.gravamen.toString(),
    selectivoUsd: assessment.selectivo.toString(),
    itbisUsd: assessment.itbis.toString(),
    landedCostUsd: assessment.landedCostPreTax.toString(),
    unitLandedCostUsd: unitLanded.toString(),
    unitCustomerPriceUsd: unitCustomer?.toString(),
  };
}
