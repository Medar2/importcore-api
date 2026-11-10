import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { AuditService } from '../../../audit/services/audit.service';
import { PermissionVerificationService } from '../../../rbac/services/permission-verification.service';
import type { User } from '../../../security/entities/user.entity';
import { evaluateDispatch } from '../../domain/dispatch-policy';
import { DISPATCH_LOCK_THRESHOLD_USD } from '../../domain/order-balance.calculator';

const OVERRIDE_PERMISSION = 'IMPORTCORE.ORDERS.OVERRIDE_DISPATCH';

export interface DispatchResult {
  orderNumber: string;
  status: string;
  balanceUsd: string;
  overrideUsed: boolean;
}

/**
 * Dispatch lock (BR-003): bloquea la entrega si el cliente tiene
 * balance >= $0.01. El override requiere permiso especifico, motivo
 * obligatorio y queda auditado de forma inmutable.
 */
@Injectable()
export class DispatchService {
  constructor(
    private readonly orders: OrdersService,
    private readonly audit: AuditService,
    private readonly permissions: PermissionVerificationService,
  ) {}

  async authorizeDispatch(
    orderId: string,
    user: User,
    overrideReason?: string,
    ipAddress?: string,
  ): Promise<DispatchResult> {
    const order = await this.orders.findById(orderId);
    const balance = await this.orders.balance(orderId);

    const canOverride = balance.dispatchLocked
      ? await this.permissions.hasPermission(user.id, OVERRIDE_PERMISSION)
      : false;
    const decision = evaluateDispatch({
      status: order.status,
      dispatchLocked: balance.dispatchLocked,
      balanceUsd: balance.balanceUsd,
      canOverride,
      overrideReason,
    });

    if (decision.kind === 'INVALID_STATUS') {
      throw new BadRequestException(decision.message);
    }
    if (decision.kind === 'DENY_BALANCE') {
      await this.auditDenied(order.id, user, balance.balanceUsd, ipAddress);
      throw new ForbiddenException(
        `Despacho bloqueado: balance pendiente $${balance.balanceUsd}. ` +
          'Se requiere autorizacion con permiso de override y motivo.',
      );
    }
    const overrideUsed = decision.kind === 'OVERRIDE';

    order.status = 'DISPATCHED';
    await this.orders.setStatus(order.id, 'DISPATCHED');

    await this.audit.logAccess({
      userId: user.id,
      userEmail: user.person?.email ?? user.username,
      organizationId: user.organizationId ?? undefined,
      action: 'DISPATCH',
      resource: 'ORDERS',
      resourceId: order.id,
      result: 'success',
      reason: overrideUsed ? `OVERRIDE: ${overrideReason}` : undefined,
      metadata: {
        orderNumber: order.orderNumber,
        balanceUsd: balance.balanceUsd,
        overrideUsed,
        blockingThreshold: DISPATCH_LOCK_THRESHOLD_USD,
      },
      ipAddress,
      endpoint: 'POST /api/orders/:id/dispatch',
      method: 'POST',
    });

    return {
      orderNumber: order.orderNumber,
      status: 'DISPATCHED',
      balanceUsd: balance.balanceUsd,
      overrideUsed,
    };
  }

  private async auditDenied(
    orderId: string,
    user: User,
    balanceUsd: string,
    ipAddress?: string,
  ): Promise<void> {
    await this.audit.logAccess({
      userId: user.id,
      userEmail: user.person?.email ?? user.username,
      organizationId: user.organizationId ?? undefined,
      action: 'DISPATCH',
      resource: 'ORDERS',
      resourceId: orderId,
      result: 'denied',
      reason: 'BR-003 dispatch lock: saldo pendiente',
      metadata: { balanceUsd },
      ipAddress,
      endpoint: 'POST /api/orders/:id/dispatch',
      method: 'POST',
    });
  }
}
