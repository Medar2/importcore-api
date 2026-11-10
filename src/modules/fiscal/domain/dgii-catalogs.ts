/** Catálogos DGII (Norma 07-2018 y Ley 32-23 de facturación electrónica). */

export const ECF_TYPES = {
  '31': 'Factura de Crédito Fiscal Electrónica',
  '32': 'Factura de Consumo Electrónica',
  '33': 'Nota de Débito Electrónica',
  '34': 'Nota de Crédito Electrónica',
  '41': 'Compras Electrónico',
  '43': 'Gastos Menores Electrónico',
  '44': 'Regímenes Especiales Electrónica',
  '45': 'Gubernamental Electrónico',
  '46': 'Comprobante para Exportaciones Electrónico',
  '47': 'Comprobante para Pagos al Exterior Electrónico',
} as const;
export type ECfType = keyof typeof ECF_TYPES;

/** 606 — tipo de bienes y servicios comprados. */
export const GOODS_SERVICES_TYPES = {
  '01': 'Gastos de personal',
  '02': 'Gastos por trabajos, suministros y servicios',
  '03': 'Arrendamientos',
  '04': 'Gastos de activos fijos',
  '05': 'Gastos de representación',
  '06': 'Otras deducciones admitidas',
  '07': 'Gastos financieros',
  '08': 'Gastos extraordinarios',
  '09': 'Compras y gastos que formarán parte del costo de venta',
  '10': 'Adquisiciones de activos',
  '11': 'Gastos de seguros',
} as const;
export type GoodsServicesType = keyof typeof GOODS_SERVICES_TYPES;

/** 606 — forma de pago. */
export const PURCHASE_PAYMENT_METHODS = {
  '01': 'Efectivo',
  '02': 'Cheques/Transferencias/Depósito',
  '03': 'Tarjeta crédito/débito',
  '04': 'Compra a crédito',
  '05': 'Permuta',
  '06': 'Nota de crédito',
  '07': 'Mixto',
} as const;
export type PurchasePaymentMethodCode = keyof typeof PURCHASE_PAYMENT_METHODS;

/** 606 — tipo de retención en ISR. */
export const ISR_WITHHOLDING_TYPES = {
  '01': 'Alquileres',
  '02': 'Honorarios por servicios',
  '03': 'Otras rentas',
  '04': 'Otras rentas (rentas presuntas)',
  '05': 'Intereses pagados a personas jurídicas',
  '06': 'Intereses pagados a personas físicas',
  '07': 'Retención por proveedores del Estado',
  '08': 'Juegos telefónicos de pronósticos',
} as const;
export type IsrWithholdingType = keyof typeof ISR_WITHHOLDING_TYPES;

/** 607 — tipo de ingreso. */
export const INCOME_TYPES = {
  '01': 'Ingresos por operaciones (no financieros)',
  '02': 'Ingresos financieros',
  '03': 'Ingresos extraordinarios',
  '04': 'Ingresos por arrendamientos',
  '05': 'Ingresos por venta de activo depreciable',
  '06': 'Otros ingresos',
} as const;
export type IncomeType = keyof typeof INCOME_TYPES;

/** 608 — tipo de anulación. */
export const CANCELLATION_TYPES = {
  '01': 'Deterioro de factura pre-impresa',
  '02': 'Errores de impresión (factura pre-impresa)',
  '03': 'Impresión defectuosa',
  '04': 'Corrección de la información',
  '05': 'Cambio de productos',
  '06': 'Devolución de productos',
  '07': 'Omisión de productos',
  '08': 'Errores en secuencia de NCF',
  '09': 'Por cese de operaciones',
  '10': 'Pérdida o hurto de talonarios',
} as const;
export type CancellationType = keyof typeof CANCELLATION_TYPES;

/** Tipo de identificación para 606/607: 1 RNC, 2 Cédula, 3 Pasaporte. */
export type TaxIdType = '1' | '2' | '3';

export const isCode = <T extends object>(catalog: T, code: string): code is Extract<keyof T, string> =>
  Object.prototype.hasOwnProperty.call(catalog, code);
