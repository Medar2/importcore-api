import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { Order } from '../../entities/order.entity';
import { OrderReminder } from '../../entities/order-reminder.entity';
import { ShipmentContainer } from '../../../shipping/entities/shipment-container.entity';
import { OrdersService } from '../services/orders.service';
import { EmailService } from '../../../notification/services/email.service';
import { reminderTriggerFor } from '../../domain/balance-reminder.policy';
import type { ReminderTrigger } from '../../domain/balance-reminder.policy';
import {
  balanceReminderHtml,
  balanceReminderSubject,
} from '../../infrastructure/email/balance-reminder.template';

export interface ReminderRunResult {
  sent: string[];
  withoutEmail: string[];
}

/**
 * Recordatorios de saldo (M7): pedidos con saldo cuyo contenedor llegó a
 * puerto o tiene ETA <= 3 días. Cada (pedido, disparador) se envía una vez.
 */
@Injectable()
export class SendBalanceRemindersUseCase {
  private readonly logger = new Logger(SendBalanceRemindersUseCase.name);

  constructor(
    @InjectRepository(ShipmentContainer)
    private readonly containers: Repository<ShipmentContainer>,
    @InjectRepository(Order)
    private readonly orders: Repository<Order>,
    @InjectRepository(OrderReminder)
    private readonly reminders: Repository<OrderReminder>,
    private readonly ordersService: OrdersService,
    private readonly email: EmailService,
  ) {}

  /** Si se pasa `containerIds`, limita la corrida a esos contenedores. */
  async execute(asOf = new Date(), containerIds?: string[]): Promise<ReminderRunResult> {
    const result: ReminderRunResult = { sent: [], withoutEmail: [] };
    const candidates = await this.containers.find({
      where: {
        status: In(['IN_TRANSIT', 'ARRIVED']),
        ...(containerIds ? { id: In(containerIds) } : {}),
      },
    });

    for (const container of candidates) {
      const trigger = reminderTriggerFor(container, asOf);
      if (!trigger) continue;
      const orders = await this.orders.find({
        where: { containerId: container.id, status: Not(In(['CANCELLED', 'DISPATCHED'])) },
        relations: ['customer'],
      });
      for (const order of orders) {
        await this.remind(order, container, trigger, result);
      }
    }

    if (result.sent.length || result.withoutEmail.length) {
      this.logger.log(
        `Recordatorios de saldo: ${result.sent.length} enviados, ${result.withoutEmail.length} sin email`,
      );
    }
    return result;
  }

  private async remind(
    order: Order,
    container: ShipmentContainer,
    trigger: ReminderTrigger,
    result: ReminderRunResult,
  ): Promise<void> {
    const already = await this.reminders.exist({ where: { orderId: order.id, trigger } });
    if (already) return;

    const balance = await this.ordersService.balance(order.id);
    if (!balance.dispatchLocked) return;

    // Sin email no se registra: se reintenta en la próxima corrida.
    const to = order.customer?.email?.trim();
    if (!to) {
      result.withoutEmail.push(order.orderNumber);
      return;
    }

    const data = {
      customerName: order.customer.name,
      orderNumber: order.orderNumber,
      containerNumber: container.containerNumber,
      balanceUsd: balance.balanceUsd,
      totalUsd: balance.totalUsd,
      trigger,
      eta: container.eta,
    };
    await this.email.sendEmail(to, balanceReminderSubject(data), balanceReminderHtml(data));
    result.sent.push(order.orderNumber);

    await this.reminders.save(
      this.reminders.create({
        orderId: order.id,
        trigger,
        channel: 'EMAIL',
        recipient: to,
        balanceUsd: balance.balanceUsd,
      }),
    );
  }
}
