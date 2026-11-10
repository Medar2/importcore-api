/**
 * Constantes derivadas de la legislación laboral y de seguridad social
 * de la República Dominicana.
 *
 * Referencias:
 *  - Código de Trabajo RD (Ley 16-92)
 *  - Ley 87-01 (Sistema Dominicano de Seguridad Social)
 *  - Código Tributario RD (Ley 11-92 y modificaciones)
 */

// ─── Laborales ─────────────────────────────────────────────────────────────────

/** Edad mínima para trabajar según Art. 245 del Código de Trabajo */
export const MIN_WORKING_AGE = 16;

/** Período máximo en meses de un contrato de prueba (Art. 26, C.T.) */
export const MAX_PROBATION_MONTHS = 3;

/** Número máximo de renovaciones de un contrato temporal antes de volverse indefinido */
export const MAX_TEMPORAL_RENEWALS = 1;

// ─── AFP — Administradoras de Fondos de Pensiones ─────────────────────────────

/** Lista de AFP autorizadas por la SIPEN (actualizada a 2025) */
export const VALID_AFP_NAMES = [
  'AFP SIEMBRA',
  'AFP POPULAR',
  'AFP SCOTIABANK',
  'AFP RESERVAS',
  'AFP ATLANTICO',
  'AFP ROMANA',
] as const;

export type AfpName = (typeof VALID_AFP_NAMES)[number];

/** Formato de número de afiliado AFP: 11 dígitos numéricos */
export const AFP_NUMBER_REGEX = /^\d{11}$/;

// ─── ARS — Administradoras de Riesgos de Salud ────────────────────────────────

/** Lista de ARS autorizadas por la SISALRIL (actualizada a 2025) */
export const VALID_ARS_NAMES = [
  'ARS HUMANO',
  'ARS SENASA',
  'ARS MAPFRE SALUD',
  'ARS META SALUD',
  'ARS YUNEN',
  'ARS PRIMERA',
  'ARS RENACER',
  'ARS RESERVAS',
  'ARS MONUMENTAL',
  'ARS UNIMEDICAL',
  'ARS FUTURO',
  'ARS ASEMAP',
  'ARS COLONIAL',
  'ARS SIMAG',
  'ARS METROVIDA',
  'ARS ORIENTAL',
  'ARS PLAN SALUD DEL SEMMA',
  'ARS CMD',
  'ARS PROFESIONAL',
  'ARS BMI',
  'ARS UNIVERSAL',
] as const;

export type ArsName = (typeof VALID_ARS_NAMES)[number];

/** Formato de número de afiliado ARS: 11 dígitos numéricos */
export const ARS_NUMBER_REGEX = /^\d{11}$/;

// ─── Cédula de identidad dominicana ───────────────────────────────────────────

/**
 * Expresión regular para cédula dominicana.
 * Acepta formato con o sin guiones: 001-1234567-8 o 00112345678
 */
export const CEDULA_REGEX = /^\d{3}-?\d{7}-?\d{1}$/;

/** Número de dígitos de la cédula (sin guiones) */
export const CEDULA_LENGTH = 11;

// ─── NSS — Número de Seguridad Social ─────────────────────────────────────────

/** Formato NSS: 11 dígitos numéricos */
export const NSS_REGEX = /^\d{11}$/;

// ─── Salario mínimo (DOP) — Resolución del CNSS, 2024 ────────────────────────

export const MINIMUM_WAGES_DOP = {
  /** Grandes empresas (> 150 empleados) */
  LARGE_COMPANY: 21000,
  /** Medianas empresas (11–150 empleados) */
  MEDIUM_COMPANY: 18000,
  /** Pequeñas empresas (≤ 10 empleados) */
  SMALL_COMPANY: 14500,
} as const;

// ─── Tasas de cotización SDSS (Ley 87-01) ────────────────────────────────────

export const SDSS_RATES = {
  /** Cotización AFP empleado */
  AFP_EMPLOYEE: 0.0287,
  /** Cotización AFP empleador */
  AFP_EMPLOYER: 0.071,
  /** Cotización ARS empleado */
  ARS_EMPLOYEE: 0.0304,
  /** Cotización ARS empleador */
  ARS_EMPLOYER: 0.0709,
  /** Riesgo laboral (empleador) */
  LABOR_RISK_EMPLOYER: 0.011,
} as const;
