import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Order } from '../../entities/order.entity';
import { OrderPayment } from '../../entities/order-payment.entity';
import { computeOrderBalance } from '../../domain/order-balance.calculator';
import { buildAgingReport } from '../../domain/receivables-aging.calculator';
import type { AgingReport } from '../../domain/receivables-aging.calculator';

/** Antigüedad de saldos CxC por pedido (M7). */
@Injectable()
export class GetReceivablesAgingUseCase {
  constructor(
    @InjectRepository(Order)
    private readonly orders: Repository<Order>,
    @InjectRepository(OrderPayment)
    private readonly payments: Repository<OrderPayment>,
  ) {}

  async execute(asOf = new Date()): Promise<AgingReport> {
    const open = await this.orders.find({
      where: { status: Not('CANCELLED') },
      relations: ['customer'],
    });
    if (open.length === 0) return buildAgingReport([], asOf);

    const paidRows = await this.payments
      .createQueryBuilder('p')
      .select('p.order_id', 'orderId')
      .addSelect('COALESCE(SUM(p.amount_usd), 0)', 'paid')
      .where('p.order_id IN (:...ids)', { ids: open.map((o) => o.id) })
      .groupBy('p.order_id')
      .getRawMany<{ orderId: string; paid: string }>();
    const paidByOrder = new Map(paidRows.map((r) => [r.orderId, r.paid]));

    return buildAgingReport(
      open.map((o) => ({
        orderId: o.id,
        orderNumber: o.orderNumber,
        customerId: o.customerId,
        customerName: o.customer?.name ?? '',
        balanceUsd: computeOrderBalance(o.totalUsd, paidByOrder.get(o.id) ?? 0).balanceUsd,
        since: o.createdAt,
      })),
      asOf,
    );
  }
}
