export interface QuoteItemBreakdown {
  description?: string;
  units: number;
  cbm: string;
  fobUsd: string;
  proratedFreightUsd: string;
  proratedInsuranceUsd: string;
  cifUsd: string;
  gravamenUsd: string;
  selectivoUsd: string;
  itbisUsd: string;
  landedCostUsd: string;
  unitLandedCostUsd: string;
  unitCustomerPriceUsd?: string;
}

export interface QuoteComputationResult {
  currency: 'USD';
  prorationBasis: string;
  recommendedContainer: string;
  totals: {
    cbm: string;
    weightKg: string;
    fobUsd: string;
    freightUsd: string;
    insuranceUsd: string;
    cifUsd: string;
    gravamenUsd: string;
    selectivoUsd: string;
    itbisUsd: string;
    landedCostUsd: string;
    customerPriceUsd?: string;
  };
  items: QuoteItemBreakdown[];
}
