import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Not, Repository } from 'typeorm';
import type { EntityManager } from 'typeorm';
import type { ECfType } from '../../domain/dgii-catalogs';
import { FiscalDocument } from '../../entities/fiscal-document.entity';
import { OrdersService } from '../../../orders/application/services/orders.service';
import { ExchangeRatesService } from '../../../currency/application/services/exchange-rates.service';
import { AuditService } from '../../../audit/services/audit.service';
import { FiscalCompanyService } from '../services/fiscal-company.service';
import { OrderPaymentsDopService } from '../services/order-payments-dop.service';
import { NcfSequenceRepository, NoSequenceAvailableError } from '../../infrastructure/repositories/ncf-sequence.repository';
import { ECF_PROVIDER } from '../ports/ecf-provider.port';
import type { ECfProvider } from '../ports/ecf-provider.port';
import { defaultSaleEcfType, formatEncf, requiresBuyerTaxId } from '../../domain/encf';
import { computeInvoiceAmounts } from '../../domain/invoice-amounts.calculator';
import { validateRnc } from '../../../customers/domain/validators/rnc.validator';
import type { EmitOrderInvoiceDto } from '../../presentation/dtos/fiscal-document.dto';
import type { User } from '../../../security/entities/user.entity';

/** Emite el e-CF de venta de un pedido (M8, BR-005). */
@Injectable()
export class EmitOrderInvoiceUseCase {
  constructor(
    @InjectRepository(FiscalDocument)
    private readonly documents: Repository<FiscalDocument>,
    @Inject(ECF_PROVIDER) private readonly provider: ECfProvider,
    private readonly dataSource: DataSource,
    private readonly orders: OrdersService,
    private readonly rates: ExchangeRatesService,
    private readonly company: FiscalCompanyService,
    private readonly paymentsDop: OrderPaymentsDopService,
    private readonly sequences: NcfSequenceRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(dto: EmitOrderInvoiceDto, user: User): Promise<FiscalDocument> {
    const order = await this.orders.findById(dto.orderId);
    if (order.status === 'CANCELLED') throw new BadRequestException('El pedido esta cancelado');
    const existing = await this.documents.findOne({
      where: { orderId: order.id, status: Not(In(['CANCELLED', 'REJECTED'])) },
    });
    if (existing) throw new ConflictException(`El pedido ya tiene el e-CF ${existing.encf}`);

    const customer = order.customer;
    const ecfType = dto.ecfType ?? defaultSaleEcfType(customer);
    if (requiresBuyerTaxId(ecfType) && !validateRnc(customer.taxId ?? '')) {
      throw new BadRequestException(`El e-CF tipo ${ecfType} requiere RNC/cedula valido del cliente`);
    }

    const issuer = await this.company.get();
    const issueDate = new Date().toISOString().slice(0, 10);
    const exchangeRate = dto.exchangeRate ?? (await this.resolveRate(issueDate));
    const amounts = this.compute(order.totalUsd, exchangeRate, dto);
    const paymentBreakdown = await this.paymentsDop.breakdown(order.id, amounts.totalDop, exchangeRate, issueDate);

    const doc = await this.dataSource.transaction(async (manager) => {
      const seq = await this.allocate(manager, ecfType);
      const encf = formatEncf(ecfType, BigInt(seq));
      const result = await this.provider.emit({
        encf, ecfType, issueDate, issuer,
        buyer: { taxId: customer.taxId, name: customer.name },
        subtotalDop: amounts.subtotalDop, itbisDop: amounts.itbisDop, totalDop: amounts.totalDop,
        exchangeRate: amounts.exchangeRate, totalUsd: order.totalUsd,
        lines: [{
          description: `Pedido de importacion ${order.orderNumber}`,
          quantity: '1', unitPriceDop: amounts.subtotalDop, itbisRate: amounts.itbisRate,
        }],
      });
      return manager.save(manager.create(FiscalDocument, {
        encf, ecfType, issueDate,
        orderId: order.id, customerId: customer.id,
        buyerTaxId: customer.taxId, buyerName: customer.name,
        incomeType: dto.incomeType ?? '01',
        totalUsd: order.totalUsd, ...amounts, paymentBreakdown,
        status: result.status, provider: this.provider.name,
        trackId: result.trackId, securityCode: result.securityCode, providerMessage: result.message,
      }));
    });

    await this.audit.logAccess({
      userId: user.id, userEmail: user.person?.email ?? user.username,
      organizationId: user.organizationId ?? undefined,
      action: 'EMIT_ECF', resource: 'FISCAL', resourceId: doc.id,
      result: doc.status === 'REJECTED' ? 'failure' : 'success',
      metadata: { encf: doc.encf, orderNumber: order.orderNumber, totalDop: doc.totalDop, provider: doc.provider },
    });
    return doc;
  }

  private async resolveRate(onOrBefore: string): Promise<string> {
    const rate = await this.rates.findLatest('USD', 'DOP', onOrBefore);
    if (!rate) throw new BadRequestException('No hay tasa USD→DOP registrada; registre una o envie exchangeRate');
    return rate.rate;
  }

  private compute(totalUsd: string, exchangeRate: string, dto: EmitOrderInvoiceDto) {
    try {
      return computeInvoiceAmounts({
        totalUsd, exchangeRate, itbisRate: dto.itbisRate,
        pricesIncludeItbis: dto.pricesIncludeItbis ?? true,
      });
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
  }

  private async allocate(manager: EntityManager, type: ECfType): Promise<string> {
    try {
      return await this.sequences.allocate(manager, type);
    } catch (e) {
      if (e instanceof NoSequenceAvailableError) throw new BadRequestException(e.message);
      throw e;
    }
  }
}
