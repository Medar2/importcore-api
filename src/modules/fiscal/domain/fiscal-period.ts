export interface FiscalPeriod {
  /** AAAAMM tal como lo pide la DGII. */
  code: string;
  /** Primer día del mes (YYYY-MM-DD). */
  start: string;
  /** Último día del mes (YYYY-MM-DD). */
  end: string;
}

/** Valida y expande un período fiscal AAAAMM. */
export function parseFiscalPeriod(code: string): FiscalPeriod {
  const m = /^(\d{4})(0[1-9]|1[0-2])$/.exec(code ?? '');
  if (!m) throw new Error('Periodo invalido, use AAAAMM (ej. 202611)');
  const year = Number(m[1]);
  const month = Number(m[2]);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    code,
    start: `${m[1]}-${m[2]}-01`,
    end: `${m[1]}-${m[2]}-${String(lastDay).padStart(2, '0')}`,
  };
}

/** YYYY-MM-DD (o Date) → AAAAMMDD para los TXT de la DGII. */
export function dgiiDate(value: string | Date | null | undefined): string {
  if (!value) return '';
  const iso = typeof value === 'string' ? value : value.toISOString();
  return iso.slice(0, 10).replace(/-/g, '');
}
