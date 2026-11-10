import { Injectable } from '@nestjs/common';
import { Decimal } from 'decimal.js';
import { recommendContainer } from '../../domain/calculators/container-capacity';
import {
  CONTAINER_SPECS,
} from '../../domain/calculators/container-capacity';
import { ProrationBasis } from '../../domain/calculators/landed-cost-prorater';
import {
  computeQuoteLine,
  prepareQuoteItems,
  ProrationContext,
  sumItemWeight,
} from '../../domain/services/quote-line-breakdown.service';
import { CalculateQuoteRequestDto } from '../../presentation/dtos/calculate-landed-cost-request.dto';
import {
  QuoteComputationResult,
  QuoteItemBreakdown,
} from '../../presentation/dtos/quote-calculation-result.dto';

/** Caso de uso stateless: calcula landed cost de una cotizacion (M3). */
@Injectable()
export class CalculateQuoteCostUseCase {
  execute(dto: CalculateQuoteRequestDto): QuoteComputationResult {
    const basis: ProrationBasis = dto.prorationBasis ?? 'CBM';
    const items = prepareQuoteItems(dto.items);

    const totalCbm = items.reduce((a, i) => a.plus(i.cbm), new Decimal(0));
    const totalWeight = sumItemWeight(items);
    const totalFob = items.reduce((a, i) => a.plus(i.fob), new Decimal(0));

    const ctx = this.buildContext(dto, basis, {
      totalCbm,
      totalWeight,
      totalFob,
    });

    const breakdowns = items.map((item) => computeQuoteLine(item, ctx));
    return this.aggregate(basis, breakdowns, totalCbm, totalWeight);
  }

  private buildContext(
    dto: CalculateQuoteRequestDto,
    basis: ProrationBasis,
    totals: { totalCbm: Decimal; totalWeight: Decimal | null; totalFob: Decimal },
  ): ProrationContext {
    const spec = dto.containerType ? CONTAINER_SPECS[dto.containerType] : null;
    return {
      basis,
      usableCbm: new Decimal(
        dto.containerUsableCbm ?? spec?.usableCbm ?? totals.totalCbm.toString(),
      ),
      payloadKg: new Decimal(
        dto.containerPayloadKg ??
          spec?.maxPayloadKg ??
          totals.totalWeight?.toString() ??
          '1',
      ),
      totalCbm: totals.totalCbm,
      totalWeight: totals.totalWeight,
      totalFob: totals.totalFob,
      freight: new Decimal(dto.containerFreightUsd),
      insurance: new Decimal(dto.containerInsuranceUsd ?? 0),
      localExpenses: new Decimal(dto.localExpensesUsd ?? 0),
      bankFees: new Decimal(dto.bankFeesUsd ?? 0),
      markup: dto.markupPercent ? new Decimal(dto.markupPercent) : null,
    };
  }

  private aggregate(
    basis: ProrationBasis,
    items: QuoteItemBreakdown[],
    totalCbm: Decimal,
    totalWeight: Decimal | null,
  ): QuoteComputationResult {
    const sum = (key: keyof QuoteItemBreakdown) =>
      items.reduce((a, i) => a.plus(i[key] as string), new Decimal(0));

    const customerTotal = items.every((i) => i.unitCustomerPriceUsd)
      ? items.reduce(
          (a, i) =>
            a.plus(new Decimal(i.unitCustomerPriceUsd as string).mul(i.units)),
          new Decimal(0),
        )
      : undefined;

    return {
      currency: 'USD',
      prorationBasis: basis,
      recommendedContainer: recommendContainer(
        totalCbm.toNumber(),
        (totalWeight ?? new Decimal(0)).toNumber(),
      ),
      totals: {
        cbm: totalCbm.toString(),
        weightKg: (totalWeight ?? new Decimal(0)).toString(),
        fobUsd: sum('fobUsd').toString(),
        freightUsd: sum('proratedFreightUsd').toString(),
        insuranceUsd: sum('proratedInsuranceUsd').toString(),
        cifUsd: sum('cifUsd').toString(),
        gravamenUsd: sum('gravamenUsd').toString(),
        selectivoUsd: sum('selectivoUsd').toString(),
        itbisUsd: sum('itbisUsd').toString(),
        landedCostUsd: sum('landedCostUsd').toString(),
        customerPriceUsd: customerTotal?.toString(),
      },
      items,
    };
  }
}
