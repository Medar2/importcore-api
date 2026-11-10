import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import { FiscalDocument } from '../../entities/fiscal-document.entity';
import { FiscalPurchase } from '../../entities/fiscal-purchase.entity';
import { FiscalCompanyService } from '../services/fiscal-company.service';
import type { FiscalPeriod } from '../../domain/fiscal-period';
import { periodOrBadRequest } from '../services/period-or-bad-request';
import { taxIdTypeOf } from '../../domain/encf';
import {
  buildDgiiFile,
  format606Line,
  format607Line,
  format608Line,
} from '../../domain/dgii-report.formatter';
import type { DgiiFormat } from '../../domain/dgii-report.formatter';

export interface DgiiReportFile {
  filename: string;
  content: string;
  records: number;
}

/** Genera los TXT 606 (compras), 607 (ventas) y 608 (anulaciones). */
@Injectable()
export class GenerateDgiiReportUseCase {
  constructor(
    @InjectRepository(FiscalDocument)
    private readonly documents: Repository<FiscalDocument>,
    @InjectRepository(FiscalPurchase)
    private readonly purchases: Repository<FiscalPurchase>,
    private readonly company: FiscalCompanyService,
  ) {}

  async execute(format: DgiiFormat, periodCode: string): Promise<DgiiReportFile> {
    const period = periodOrBadRequest(periodCode);
    const { rnc } = await this.company.get();

    const lines =
      format === '606' ? await this.lines606(period)
      : format === '607' ? await this.lines607(period)
      : await this.lines608(period);

    return {
      filename: `DGII_F_${format}_${rnc}_${period.code}.TXT`,
      content: buildDgiiFile(format, rnc, period.code, lines),
      records: lines.length,
    };
  }

  private async lines606(p: FiscalPeriod): Promise<string[]> {
    const rows = await this.purchases.find({
      where: { invoiceDate: Between(p.start, p.end) },
      order: { invoiceDate: 'ASC', ncf: 'ASC' },
    });
    return rows.map((r) =>
      format606Line({
        taxId: r.supplierTaxId, taxIdType: r.supplierTaxIdType,
        goodsServicesType: r.goodsServicesType, ncf: r.ncf, modifiedNcf: r.modifiedNcf,
        invoiceDate: r.invoiceDate, paymentDate: r.paymentDate,
        servicesAmount: r.servicesAmount, goodsAmount: r.goodsAmount,
        itbisBilled: r.itbisBilled, itbisWithheld: r.itbisWithheld, itbisToCost: r.itbisToCost,
        isrWithholdingType: r.isrWithholdingType, isrWithheld: r.isrWithheld,
        selectiveTax: r.selectiveTax, otherTaxes: r.otherTaxes, legalTip: r.legalTip,
        paymentMethod: r.paymentMethod,
      }),
    );
  }

  /** Solo comprobantes vigentes; los anulados van al 608. */
  private async lines607(p: FiscalPeriod): Promise<string[]> {
    const rows = await this.documents.find({
      where: { issueDate: Between(p.start, p.end), status: In(['ACCEPTED', 'CONDITIONAL']) },
      order: { encf: 'ASC' },
    });
    return rows.map((d) =>
      format607Line({
        taxId: d.buyerTaxId ?? '', taxIdType: d.buyerTaxId ? taxIdTypeOf(d.buyerTaxId) : '3',
        ncf: d.encf, incomeType: d.incomeType, invoiceDate: d.issueDate,
        billedAmount: d.subtotalDop, itbisBilled: d.itbisDop,
        ...d.paymentBreakdown,
      }),
    );
  }

  private async lines608(p: FiscalPeriod): Promise<string[]> {
    const rows = await this.documents.find({
      where: {
        status: 'CANCELLED',
        cancelledAt: Between(new Date(`${p.start}T00:00:00`), new Date(`${p.end}T23:59:59.999`)),
      },
      order: { encf: 'ASC' },
    });
    return rows.map((d) =>
      format608Line({ ncf: d.encf, invoiceDate: d.issueDate, cancellationType: d.cancellationType ?? '04' }),
    );
  }
}
