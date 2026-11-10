import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SystemConfigService } from '../../../config/services/system-config.service';
import { validateRnc } from '../../../customers/domain/validators/rnc.validator';

export interface FiscalCompany {
  rnc: string;
  name: string;
}

/**
 * Datos fiscales del emisor: `FISCAL.COMPANY_RNC` / `FISCAL.COMPANY_NAME`
 * en configuración del sistema, con fallback a `COMPANY_RNC` / `COMPANY_NAME`.
 */
@Injectable()
export class FiscalCompanyService {
  constructor(
    private readonly systemConfig: SystemConfigService,
    private readonly env: ConfigService,
  ) {}

  async get(): Promise<FiscalCompany> {
    const rnc =
      (await this.systemConfig.getValue('FISCAL.COMPANY_RNC')) ||
      this.env.get<string>('COMPANY_RNC') ||
      '';
    const name =
      (await this.systemConfig.getValue('FISCAL.COMPANY_NAME')) ||
      this.env.get<string>('COMPANY_NAME') ||
      'Todo Import RD';

    const digits = rnc.replace(/\D/g, '');
    if (!validateRnc(digits)) {
      throw new BadRequestException(
        'Configure un RNC valido de la empresa en FISCAL.COMPANY_RNC antes de emitir o generar reportes',
      );
    }
    return { rnc: digits, name };
  }
}
