import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Decimal } from 'decimal.js';
import { Order } from '../../entities/order.entity';
import { OrderPayment } from '../../entities/order-payment.entity';
import { Quote } from '../../../landed-cost/entities/quote.entity';
import { CreateOrderDto, RegisterPaymentDto } from '../../presentation/dtos/order.dto';
import {
  computeOrderBalance,
  paymentExceedsBalance,
} from '../../domain/order-balance.calculator';
import type { OrderBalance } from '../../domain/order-balance.calculator';
import { convertToUsd } from '../../../currency/domain/convert-to-usd';

export type { OrderBalance };

export interface OrderTrackingResult {
  orderId: string;
  orderNumber: string;
  status: Order['status'];
  customerName: string;
  financial: {
    totalUsd: string;
    paidUsd: string;
    balanceUsd: string;
    dispatchLocked: boolean;
  };
  liberationMessage: string;
  container: {
    id: string;
    containerNumber: string;
    containerType: string;
    status: string;
    etd: string | null;
    eta: string | null;
    ata: string | null;
  } | null;
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orders: Repository<Order>,
    @InjectRepository(OrderPayment)
    private readonly payments: Repository<OrderPayment>,
    @InjectRepository(Quote)
    private readonly quotes: Repository<Quote>,
  ) {}

  async create(dto: CreateOrderDto): Promise<Order> {
    if (!dto.quoteId && !dto.customerId) {
      throw new BadRequestException('Indique customerId o convierta desde una cotizacion');
    }

    let totalUsd = '0';
    let itemsSnapshot: unknown = null;
    let quoteContainerId: string | null = null;
    let customerId = dto.customerId ?? '';
    let quoteId: string | null = dto.quoteId ?? null;

    if (dto.quoteId) {
      const quote = await this.quotes.findOne({ where: { id: dto.quoteId } });
      if (!quote) throw new NotFoundException('Cotizacion no encontrada');
      if (quote.status === 'CONVERTED') {
        throw new BadRequestException('La cotizacion ya fue convertida');
      }
      if (quote.status !== 'ACCEPTED') {
        throw new BadRequestException(
          'Solo se convierten cotizaciones en estado ACCEPTED (aceptada por el cliente)',
        );
      }
      customerId = dto.customerId ?? quote.customerId ?? '';
      if (!customerId) {
        throw new BadRequestException(
          'La cotizacion no tiene cliente registrado: envie customerId al crear el pedido',
        );
      }
      const r = quote.calculationResult;
      totalUsd = new Decimal(r.totals.customerPriceUsd ?? r.totals.landedCostUsd)
        .toDecimalPlaces(4, Decimal.ROUND_HALF_UP)
        .toFixed(4);
      itemsSnapshot = r.items;
      quoteContainerId = quote.containerId;
      quote.status = 'CONVERTED';
      await this.quotes.save(quote);
    }

    const order = this.orders.create({
      orderNumber: this.nextOrderNumber(),
      customerId,
      quoteId,
      containerId: dto.containerId ?? quoteContainerId,
      status: 'PENDING',
      currency: 'USD',
      totalUsd,
      itemsSnapshot,
      notes: dto.notes ?? null,
    });
    return this.orders.save(order);
  }

  async findAll(status?: string): Promise<Order[]> {
    return this.orders.find({
      where: status ? { status: status as Order['status'] } : {},
      relations: ['customer'],
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<Order> {
    const o = await this.orders.findOne({ where: { id }, relations: ['customer', 'quote'] });
    if (!o) throw new NotFoundException('Pedido no encontrado');
    return o;
  }

  async balance(orderId: string): Promise<OrderBalance> {
    const order = await this.findById(orderId);
    const paid = await this.payments
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.amount_usd), 0)', 'total')
      .where('p.order_id = :id', { id: orderId })
      .getRawOne<{ total: string }>();

    return computeOrderBalance(order.totalUsd, paid?.total ?? 0);
  }

  async registerPayment(orderId: string, dto: RegisterPaymentDto): Promise<OrderPayment> {
    const currency = dto.currency ?? 'USD';
    const conv = convertToUsd(dto.amount, currency, dto.exchangeRateToUsd);
    if (!conv.ok) throw new BadRequestException(conv.error);

    return this.orders.manager.transaction(async (m) => {
      const order = await m.findOne(Order, {
        where: { id: orderId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!order) throw new NotFoundException('Pedido no encontrado');
      if (order.status === 'CANCELLED' || order.status === 'DISPATCHED') {
        throw new BadRequestException('No se pueden registrar pagos en este estado');
      }

      const paid = await m
        .createQueryBuilder(OrderPayment, 'p')
        .select('COALESCE(SUM(p.amount_usd), 0)', 'total')
        .where('p.order_id = :id', { id: orderId })
        .getRawOne<{ total: string }>();
      const { balanceUsd } = computeOrderBalance(order.totalUsd, paid?.total ?? 0);
      if (paymentExceedsBalance(balanceUsd, conv.amountUsd)) {
        throw new BadRequestException(
          `El pago (USD ${new Decimal(conv.amountUsd).toFixed(2)}) excede el saldo pendiente (USD ${Decimal.max(balanceUsd, 0).toFixed(2)})`,
        );
      }

      return m.save(
        m.create(OrderPayment, {
          orderId,
          currency,
          amount: conv.amount,
          amountUsd: conv.amountUsd,
          exchangeRate: conv.rate,
          method: dto.method ?? 'TRANSFER',
          reference: dto.reference ?? null,
          paidAt: dto.paidAt ?? new Date().toISOString().slice(0, 10),
          notes: dto.notes ?? null,
        }),
      );
    });
  }

  async setStatus(id: string, status: Order['status']): Promise<Order> {
    const order = await this.findById(id);
    order.status = status;
    return this.orders.save(order);
  }

  /**
   * Vista de tracking del pedido para el cliente:
   * Combina el estado logístico del contenedor desde China con la
   * regla de liberación y despacho aduanal (BR-003).
   */
  async tracking(id: string): Promise<OrderTrackingResult> {
    const order = await this.orders.findOne({
      where: { id },
      relations: ['customer', 'container'],
    });
    if (!order) throw new NotFoundException('Pedido no encontrado');

    const bal = await this.balance(id);

    let containerInfo: OrderTrackingResult['container'] = null;
    if (order.container) {
      containerInfo = {
        id: order.container.id,
        containerNumber: order.container.containerNumber,
        containerType: order.container.containerType,
        status: order.container.status,
        etd: order.container.etd,
        eta: order.container.eta,
        ata: order.container.ata,
      };
    }

    let liberationMessage = 'Pedido en preparación y consolidación en origen (China).';
    if (order.status === 'ARRIVED') {
      if (bal.dispatchLocked) {
        liberationMessage = `¡Tu mercancía ha llegado al puerto! Tienes un saldo pendiente de US$ ${new Decimal(bal.balanceUsd).toFixed(2)}. Favor completar el pago para autorizar la liberación aduanal y entrega.`;
      } else {
        liberationMessage =
          'Tu mercancía ha llegado al puerto y el saldo está liquidado. Lista para despacho aduanal y entrega.';
      }
    } else if (order.status === 'IN_TRANSIT') {
      liberationMessage = `Tu mercancía está en tránsito marítimo hacia el puerto de destino. Llegada estimada (ETA): ${order.container?.eta ?? 'Por confirmar'}.`;
    } else if (order.status === 'READY' || order.status === 'DISPATCHED') {
      liberationMessage =
        'Pedido listo para retiro o despachado con liberación autorizada.';
    }

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      customerName: order.customer?.name ?? 'Cliente',
      financial: {
        totalUsd: bal.totalUsd,
        paidUsd: bal.paidUsd,
        balanceUsd: bal.balanceUsd,
        dispatchLocked: bal.dispatchLocked,
      },
      liberationMessage,
      container: containerInfo,
    };
  }

  private nextOrderNumber(): string {
    const d = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `OD-${d}-${rand}`;
  }
}
