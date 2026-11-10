import { BadRequestException, Injectable } from '@nestjs/common';
import { OrdersService } from '../services/orders.service';
import { AuditService } from '../../../audit/services/audit.service';
import { allowedTransitions, canTransition } from '../../domain/order-status-transitions';
import type { Order, OrderStatus } from '../../entities/order.entity';
import type { User } from '../../../security/entities/user.entity';

/** Avanza el pedido por su ciclo de vida (M5) con validación y auditoría. */
@Injectable()
export class ChangeOrderStatusUseCase {
  constructor(
    private readonly orders: OrdersService,
    private readonly audit: AuditService,
  ) {}

  async execute(
    orderId: string,
    to: OrderStatus,
    user: User,
    notes?: string,
    ipAddress?: string,
  ): Promise<Order> {
    const order = await this.orders.findById(orderId);
    const from = order.status;

    if (!canTransition(from, to)) {
      const allowed = allowedTransitions(from);
      throw new BadRequestException(
        `Transicion invalida ${from} → ${to}. ` +
          (allowed.length ? `Permitidas: ${allowed.join(', ')}` : 'Estado terminal'),
      );
    }

    const saved = await this.orders.setStatus(orderId, to);

    await this.audit.logAccess({
      userId: user.id,
      userEmail: user.person?.email ?? user.username,
      organizationId: user.organizationId ?? undefined,
      action: 'STATUS_CHANGE',
      resource: 'ORDERS',
      resourceId: orderId,
      result: 'success',
      reason: notes?.trim() || undefined,
      metadata: { orderNumber: order.orderNumber, from, to },
      ipAddress,
      endpoint: 'PATCH /api/orders/:id/status',
      method: 'PATCH',
    });

    return saved;
  }
}
