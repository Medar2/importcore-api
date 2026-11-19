import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { canTransitionQuote } from '../../domain/quote-status-transitions';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quote, QuoteStatus } from '../../entities/quote.entity';
import { Order } from '../../../orders/entities/order.entity';
import { ShippingService } from '../../../shipping/application/services/shipping.service';
import type { QuoteComputationResult } from '../../presentation/dtos/quote-calculation-result.dto';

const QUOTE_STATUSES: QuoteStatus[] = [
  'DRAFT',
  'SENT',
  'ACCEPTED',
  'REJECTED',
  'CONVERTED',
];

export interface QuoteSummary {
  id: string;
  quoteNumber: string;
  customerName: string | null;
  customerId: string | null;
  customer: { id: string; name: string; taxId: string } | null;
  containerId: string | null;
  container: {
    id: string;
    containerNumber: string;
    containerType: string;
    status: string;
  } | null;
  status: QuoteStatus;
  currency: string;
  landedCostUsd: string;
  customerPriceUsd: string | null;
  validUntil: string | null;
  createdAt: Date;
  cbm: string | null;
  weightKg: string | null;
}

export interface QuotePage {
  items: QuoteSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface QuoteSpaceReservation {
  /** True solo mientras la cotizacion activa ocupa CBM en un contenedor. */
  reservesSpace: boolean;
  /** QUOTE: reserva propia. ORDER: el espacio paso al pedido convertido. */
  heldBy: 'QUOTE' | 'ORDER' | null;
  cbm: string;
  weightKg: string;
  recommendedContainer: string | null;
  shareCbmPercent: number | null;
  container: {
    id: string;
    containerNumber: string;
    containerType: string;
    status: string;
    etd: string | null;
    eta: string | null;
    ata: string | null;
    blNumber: string | null;
    capacityCbm: number | null;
    capacityKg: number | null;
    usedCbm: number | null;
    usedKg: number | null;
    remainingCbm: number | null;
    remainingKg: number | null;
    occupancyCbmPercent: number | null;
    isOverloaded: boolean;
  } | null;
}

export interface QuoteDetailView {
  id: string;
  quoteNumber: string;
  customerName: string | null;
  customerId: string | null;
  customer: {
    id: string;
    name: string;
    taxId: string;
    phone: string | null;
    email: string | null;
  } | null;
  containerId: string | null;
  status: QuoteStatus;
  currency: string;
  landedCostUsd: string;
  customerPriceUsd: string | null;
  validUntil: string | null;
  createdAt: Date;
  updatedAt: Date;
  calculationResult: QuoteComputationResult;
  requestSnapshot: unknown;
  order: { id: string; orderNumber: string; status: string } | null;
  reservation: QuoteSpaceReservation;
}

/** Consultas y transiciones de estado de cotizaciones (M3). */
@Injectable()
export class QuoteQueriesService {
  constructor(
    @InjectRepository(Quote)
    private readonly quotes: Repository<Quote>,
    @InjectRepository(Order)
    private readonly orders: Repository<Order>,
    private readonly shipping: ShippingService,
  ) {}

  async findPage(query: {
    status?: string;
    page?: string;
    pageSize?: string;
  }): Promise<QuotePage> {
    const status = this.parseStatus(query.status);
    const page = this.parsePositiveInt(query.page, 1, 10_000);
    const pageSize = this.parsePositiveInt(query.pageSize, 10, 50);

    const qb = this.quotes
      .createQueryBuilder('quote')
      .leftJoinAndSelect('quote.customer', 'customer')
      .leftJoinAndSelect('quote.container', 'container')
      .orderBy('quote.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    if (status) qb.andWhere('quote.status = :status', { status });

    const [rows, total] = await qb.getManyAndCount();
    return {
      items: rows.map((quote) => this.toSummary(quote)),
      total,
      page,
      pageSize,
    };
  }

  async findById(id: string): Promise<Quote> {
    const quote = await this.quotes.findOne({
      where: { id },
      relations: ['customer', 'container'],
    });
    if (!quote) throw new NotFoundException('Cotizacion no encontrada');
    return quote;
  }

  async findDetail(id: string): Promise<QuoteDetailView> {
    const quote = await this.findById(id);
    const order = await this.orders.findOne({ where: { quoteId: id } });
    const orderSummary = order
      ? { id: order.id, orderNumber: order.orderNumber, status: order.status }
      : null;

    return {
      id: quote.id,
      quoteNumber: quote.quoteNumber,
      customerName: quote.customerName,
      customerId: quote.customerId,
      customer: quote.customer
        ? {
            id: quote.customer.id,
            name: quote.customer.name,
            taxId: quote.customer.taxId,
            phone: quote.customer.phone,
            email: quote.customer.email,
          }
        : null,
      containerId: quote.containerId,
      status: quote.status,
      currency: quote.currency,
      landedCostUsd: quote.landedCostUsd,
      customerPriceUsd: quote.customerPriceUsd,
      validUntil: quote.validUntil,
      createdAt: quote.createdAt,
      updatedAt: quote.updatedAt,
      calculationResult: quote.calculationResult,
      requestSnapshot: quote.requestSnapshot ?? null,
      order: orderSummary,
      reservation: await this.buildReservation(quote, orderSummary),
    };
  }

  async transition(id: string, status: QuoteStatus): Promise<Quote> {
    const quote = await this.findById(id);
    if (!canTransitionQuote(quote.status, status)) {
      throw new BadRequestException(
        `Transicion invalida ${quote.status} → ${status}. CONVERTED solo al crear un pedido.`,
      );
    }
    quote.status = status;
    return this.quotes.save(quote);
  }

  private toSummary(quote: Quote): QuoteSummary {
    const totals = quote.calculationResult?.totals;
    return {
      id: quote.id,
      quoteNumber: quote.quoteNumber,
      customerName: quote.customerName,
      customerId: quote.customerId,
      customer: quote.customer
        ? {
            id: quote.customer.id,
            name: quote.customer.name,
            taxId: quote.customer.taxId,
          }
        : null,
      containerId: quote.containerId,
      container: quote.container
        ? {
            id: quote.container.id,
            containerNumber: quote.container.containerNumber,
            containerType: quote.container.containerType,
            status: quote.container.status,
          }
        : null,
      status: quote.status,
      currency: quote.currency,
      landedCostUsd: quote.landedCostUsd,
      customerPriceUsd: quote.customerPriceUsd,
      validUntil: quote.validUntil,
      createdAt: quote.createdAt,
      cbm: totals?.cbm ?? null,
      weightKg: totals?.weightKg ?? null,
    };
  }

  private async buildReservation(
    quote: Quote,
    order: { id: string } | null,
  ): Promise<QuoteSpaceReservation> {
    const totals = quote.calculationResult?.totals;
    let occupancy: Awaited<ReturnType<ShippingService['occupancy']>> | null = null;
    if (quote.containerId) {
      try {
        occupancy = await this.shipping.occupancy(quote.containerId);
      } catch {
        occupancy = null;
      }
    }

    const quoteItem = occupancy?.items.find(
      (item) => item.type === 'QUOTE' && item.id === quote.id,
    );
    const orderItem = order
      ? occupancy?.items.find((item) => item.type === 'ORDER' && item.id === order.id)
      : undefined;
    const heldBy = quoteItem ? 'QUOTE' : orderItem ? 'ORDER' : null;
    const share = quoteItem ?? orderItem;
    const container = quote.container;

    return {
      reservesSpace: heldBy === 'QUOTE',
      heldBy,
      cbm: totals?.cbm ?? '0',
      weightKg: totals?.weightKg ?? '0',
      recommendedContainer: quote.calculationResult?.recommendedContainer ?? null,
      shareCbmPercent: share?.cbmSharePercent ?? null,
      container: quote.containerId
        ? {
            id: quote.containerId,
            containerNumber:
              occupancy?.containerNumber ?? container?.containerNumber ?? '—',
            containerType: occupancy?.containerType ?? container?.containerType ?? '',
            status: occupancy?.status ?? container?.status ?? '',
            etd: container?.etd ?? null,
            eta: container?.eta ?? null,
            ata: container?.ata ?? null,
            blNumber: container?.blNumber ?? null,
            capacityCbm: occupancy?.capacityCbm ?? null,
            capacityKg: occupancy?.capacityKg ?? null,
            usedCbm: occupancy?.usedCbm ?? null,
            usedKg: occupancy?.usedKg ?? null,
            remainingCbm: occupancy?.remainingCbm ?? null,
            remainingKg: occupancy?.remainingKg ?? null,
            occupancyCbmPercent: occupancy?.occupancyCbmPercent ?? null,
            isOverloaded: occupancy?.isOverloaded ?? false,
          }
        : null,
    };
  }

  private parseStatus(status?: string): QuoteStatus | undefined {
    if (!status || status.trim() === '') return undefined;
    if (!QUOTE_STATUSES.includes(status as QuoteStatus)) {
      throw new BadRequestException('Estado de cotizacion invalido');
    }
    return status as QuoteStatus;
  }

  private parsePositiveInt(value: string | undefined, fallback: number, max: number): number {
    if (value == null || value.trim() === '') return fallback;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      throw new BadRequestException('Parametro de paginacion invalido');
    }
    return Math.min(max, Math.max(1, Math.floor(parsed)));
  }
}
