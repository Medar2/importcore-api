import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../../orders/entities/order.entity';
import { orderStatusForContainer } from '../../../orders/domain/order-status-transitions';
import type { ShipmentContainer } from '../../entities/shipment-container.entity';

export interface ContainerOrdersSyncResult {
  updated: { orderNumber: string; from: string; to: string }[];
}

/** Propaga salida/llegada del contenedor a sus pedidos asignados (M5). */
@Injectable()
export class ContainerOrdersSyncService {
  constructor(
    @InjectRepository(Order)
    private readonly orders: Repository<Order>,
  ) {}

  async sync(container: ShipmentContainer): Promise<ContainerOrdersSyncResult> {
    const assigned = await this.orders.find({ where: { containerId: container.id } });
    const updated: ContainerOrdersSyncResult['updated'] = [];
    const changed: Order[] = [];

    for (const order of assigned) {
      const next = orderStatusForContainer(container.status, order.status);
      if (!next) continue;
      updated.push({ orderNumber: order.orderNumber, from: order.status, to: next });
      order.status = next;
      changed.push(order);
    }

    if (changed.length) await this.orders.save(changed);
    return { updated };
  }
}
