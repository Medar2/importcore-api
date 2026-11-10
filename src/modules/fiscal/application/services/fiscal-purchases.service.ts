import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Decimal } from 'decimal.js';
import { FiscalPurchase } from '../../entities/fiscal-purchase.entity';
import { isValidNcf, taxIdTypeOf } from '../../domain/encf';
import { periodOrBadRequest } from './period-or-bad-request';
import { validateRnc } from '../../../customers/domain/validators/rnc.validator';
import type { CreateFiscalPurchaseDto } from '../../presentation/dtos/fiscal-purchase.dto';

const AMOUNT_FIELDS = [
  'servicesAmount', 'goodsAmount', 'itbisBilled', 'itbisWithheld', 'itbisToCost',
  'isrWithheld', 'selectiveTax', 'otherTaxes', 'legalTip',
] as const;

/** Registro de compras/gastos locales con comprobante fiscal (606). */
@Injectable()
export class FiscalPurchasesService {
  constructor(
    @InjectRepository(FiscalPurchase)
    private readonly repo: Repository<FiscalPurchase>,
  ) {}

  list(period?: string): Promise<FiscalPurchase[]> {
    const where: Record<string, unknown> = {};
    if (period) {
      const p = periodOrBadRequest(period);
      where.invoiceDate = Between(p.start, p.end);
    }
    return this.repo.find({ where, order: { invoiceDate: 'DESC' } });
  }

  async create(dto: CreateFiscalPurchaseDto): Promise<FiscalPurchase> {
    const taxId = dto.supplierTaxId.replace(/\D/g, '');
    if (!validateRnc(taxId)) throw new BadRequestException('RNC/cedula del proveedor invalido');
    const ncf = dto.ncf.trim().toUpperCase();
    if (!isValidNcf(ncf)) throw new BadRequestException('NCF/e-NCF invalido');
    if (dto.modifiedNcf && !isValidNcf(dto.modifiedNcf.trim().toUpperCase())) {
      throw new BadRequestException('NCF modificado invalido');
    }

    const amounts = this.normalizeAmounts(dto);
    if (new Decimal(amounts.servicesAmount).plus(amounts.goodsAmount).lte(0)) {
      throw new BadRequestException('Indique monto de servicios y/o bienes');
    }
    if (new Decimal(amounts.itbisToCost).gt(amounts.itbisBilled)) {
      throw new BadRequestException('El ITBIS llevado al costo no puede exceder el facturado');
    }
    if (new Decimal(amounts.isrWithheld).gt(0) && !dto.isrWithholdingType) {
      throw new BadRequestException('Indique el tipo de retencion ISR');
    }

    const dup = await this.repo.findOne({ where: { supplierTaxId: taxId, ncf } });
    if (dup) throw new ConflictException('Ese NCF ya fue registrado para este proveedor');

    return this.repo.save(
      this.repo.create({
        supplierTaxId: taxId,
        supplierTaxIdType: taxIdTypeOf(taxId),
        supplierName: dto.supplierName.trim(),
        goodsServicesType: dto.goodsServicesType,
        ncf,
        modifiedNcf: dto.modifiedNcf?.trim().toUpperCase() || null,
        invoiceDate: dto.invoiceDate,
        paymentDate: dto.paymentDate ?? null,
        ...amounts,
        isrWithholdingType: dto.isrWithholdingType ?? null,
        paymentMethod: dto.paymentMethod,
        purchaseOrderId: dto.purchaseOrderId ?? null,
        notes: dto.notes ?? null,
      }),
    );
  }

  async remove(id: string): Promise<void> {
    const res = await this.repo.delete(id);
    if (!res.affected) throw new NotFoundException('Compra no encontrada');
  }

  private normalizeAmounts(dto: CreateFiscalPurchaseDto): Record<(typeof AMOUNT_FIELDS)[number], string> {
    const out = {} as Record<(typeof AMOUNT_FIELDS)[number], string>;
    for (const f of AMOUNT_FIELDS) {
      const v = new Decimal(dto[f] || 0);
      if (v.isNeg()) throw new BadRequestException(`${f} no puede ser negativo`);
      out[f] = v.toDecimalPlaces(2).toString();
    }
    return out;
  }
}
