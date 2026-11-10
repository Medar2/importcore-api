import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { Decimal } from 'decimal.js';
import { OrderPayment } from '../../../orders/entities/order-payment.entity';
import type { PaymentMethod } from '../../../orders/entities/order-payment.entity';
import { buildPaymentBreakdown } from '../../domain/invoice-amounts.calculator';
import type { PaymentBreakdown, SalePaymentForm } from '../../domain/invoice-amounts.calculator';

const FORM_BY_METHOD: Record<PaymentMethod, Exclude<SalePaymentForm, 'credit'>> = {
  CASH: 'cash',
  TRANSFER: 'transfer',
  CHECK: 'transfer',
  OTHER: 'transfer',
  CARD: 'card',
};

/** Cobros del pedido hasta la fecha de emisión, expresados en DOP (607). */
@Injectable()
export class OrderPaymentsDopService {
  constructor(
    @InjectRepository(OrderPayment)
    private readonly payments: Repository<OrderPayment>,
  ) {}

  async breakdown(
    orderId: string,
    totalDop: string,
    invoiceRate: string,
    issueDate: string,
  ): Promise<PaymentBreakdown> {
    const rows = await this.payments.find({
      where: { orderId, paidAt: LessThanOrEqual(issueDate) },
      order: { paidAt: 'ASC' },
    });
    return buildPaymentBreakdown(
      totalDop,
      rows.map((p) => ({
        form: FORM_BY_METHOD[p.method] ?? 'transfer',
        amountDop:
          p.currency === 'DOP'
            ? p.amount
            : new Decimal(p.amountUsd).mul(invoiceRate).toDecimalPlaces(2).toString(),
      })),
    );
  }
}
