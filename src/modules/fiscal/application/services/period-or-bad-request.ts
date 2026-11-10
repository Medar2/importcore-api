import { BadRequestException } from '@nestjs/common';
import { parseFiscalPeriod } from '../../domain/fiscal-period';
import type { FiscalPeriod } from '../../domain/fiscal-period';

export function periodOrBadRequest(code: string): FiscalPeriod {
  try {
    return parseFiscalPeriod(code);
  } catch (e) {
    throw new BadRequestException((e as Error).message);
  }
}
