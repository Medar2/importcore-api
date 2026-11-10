import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Decimal } from 'decimal.js';
import { ShipmentContainer } from '../../entities/shipment-container.entity';
import { Quote } from '../../../landed-cost/entities/quote.entity';
import { Order } from '../../../orders/entities/order.entity';
import { optimizeLoad } from '../../../landed-cost/domain/services/load-optimizer.service';
import type { LoadOptimization } from '../../../landed-cost/domain/services/load-optimizer.service';
import { CONTAINER_SPECS } from '../../../landed-cost/domain/calculators/container-capacity';
import {
  CreateContainerDto,
  OptimizeLoadDto,
  UpdateContainerDto,
} from '../../presentation/dtos/shipping.dto';
import {
  computeContainerOccupancy,
  ContainerOccupancyResult,
  OccupantInputItem,
} from '../../domain/container-occupancy.calculator';
import type {
  ContainerTrackingProvider,
  TrackingResult,
} from '../../domain/tracking-provider.interface';
import { ContainerOrdersSyncService } from './container-orders-sync.service';

export interface ContainerAvailability {
  id: string;
  containerNumber: string;
  containerType: string;
  status: string;
  capacityCbm: number;
  capacityKg: number;
  usedCbm: string;
  usedKg: string;
  remainingCbm: string;
  remainingKg: string;
}

@Injectable()
export class ShippingService {
  constructor(
    @InjectRepository(ShipmentContainer)
    private readonly repo: Repository<ShipmentContainer>,
    @InjectRepository(Quote)
    private readonly quotes: Repository<Quote>,
    @InjectRepository(Order)
    private readonly orders: Repository<Order>,
    @Inject('TRACKING_PROVIDER')
    private readonly trackingProvider: ContainerTrackingProvider,
    private readonly ordersSync: ContainerOrdersSyncService,
  ) {}

  async create(dto: CreateContainerDto): Promise<ShipmentContainer> {
    const exists = await this.repo.findOne({
      where: { containerNumber: dto.containerNumber },
    });
    if (exists) throw new ConflictException('Contenedor ya registrado');

    return this.repo.save(
      this.repo.create({
        containerNumber: dto.containerNumber,
        containerType: dto.containerType,
        sealNumber: dto.sealNumber ?? null,
        blNumber: dto.blNumber ?? null,
        etd: dto.etd ?? null,
        eta: dto.eta ?? null,
        demurrageFreeDays: dto.demurrageFreeDays ?? 4,
        demurrageDailyRateUsd: dto.demurrageDailyRateUsd ?? '0',
        notes: dto.notes ?? null,
      }),
    );
  }

  findAll(status?: string): Promise<ShipmentContainer[]> {
    return this.repo.find({
      where: status ? { status: status as ShipmentContainer['status'] } : {},
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<ShipmentContainer> {
    const c = await this.repo.findOne({ where: { id } });
    if (!c) throw new NotFoundException('Contenedor no encontrado');
    return c;
  }

  async update(id: string, dto: UpdateContainerDto): Promise<ShipmentContainer> {
    const c = await this.findById(id);
    Object.assign(c, {
      status: dto.status ?? c.status,
      sealNumber: dto.sealNumber ?? c.sealNumber,
      blNumber: dto.blNumber ?? c.blNumber,
      etd: dto.etd ?? c.etd,
      eta: dto.eta ?? c.eta,
      ata: dto.ata ?? c.ata,
      demurrageFreeDays: dto.demurrageFreeDays ?? c.demurrageFreeDays,
      demurrageDailyRateUsd:
        dto.demurrageDailyRateUsd ?? c.demurrageDailyRateUsd,
      notes: dto.notes ?? c.notes,
    });
    return this.repo.save(c);
  }

  /**
   * Desglose completo de ocupación (% CBM, % Peso, items asignados)
   * de un contenedor para visualización del gestor y del cliente.
   */
  async occupancy(
    id: string,
  ): Promise<
    ContainerOccupancyResult & {
      containerId: string;
      containerNumber: string;
      status: string;
    }
  > {
    const c = await this.findById(id);

    const [quotes, orders] = await Promise.all([
      this.quotes.find({
        where: { containerId: c.id },
        relations: ['customer'],
      }),
      this.orders.find({
        where: { containerId: c.id },
        relations: ['customer', 'quote'],
      }),
    ]);

    const activeQuoteStatuses = new Set(['DRAFT', 'SENT', 'ACCEPTED']);
    const excludedOrderStatuses = new Set(['CANCELLED', 'DISPATCHED']);
    const items: OccupantInputItem[] = [];

    for (const q of quotes) {
      if (!activeQuoteStatuses.has(q.status)) continue;
      const totals = q.calculationResult?.totals;
      items.push({
        id: q.id,
        type: 'QUOTE',
        reference: q.quoteNumber,
        customerId: q.customerId,
        customerName: q.customer?.name ?? q.customerName ?? 'Cliente',
        status: q.status,
        cbm: totals?.cbm ?? 0,
        weightKg: totals?.weightKg ?? 0,
      });
    }

    for (const o of orders) {
      if (excludedOrderStatuses.has(o.status)) continue;
      let cbm = 0;
      let weightKg = 0;
      if (o.quote?.calculationResult?.totals) {
        cbm = Number(o.quote.calculationResult.totals.cbm ?? 0);
        weightKg = Number(o.quote.calculationResult.totals.weightKg ?? 0);
      } else if (Array.isArray(o.itemsSnapshot)) {
        for (const it of o.itemsSnapshot as Array<{
          cbm?: number | string;
          weightKg?: number | string;
        }>) {
          cbm += Number(it.cbm ?? 0);
          weightKg += Number(it.weightKg ?? 0);
        }
      }
      items.push({
        id: o.id,
        type: 'ORDER',
        reference: o.orderNumber,
        customerId: o.customerId,
        customerName: o.customer?.name ?? 'Cliente',
        status: o.status,
        cbm,
        weightKg,
      });
    }

    const calc = computeContainerOccupancy(c.containerType, items);

    return {
      containerId: c.id,
      containerNumber: c.containerNumber,
      status: c.status,
      ...calc,
    };
  }

  /**
   * Sincroniza el rastreo marítimo en tiempo real desde la API del transportista
   * (o Mock para desarrollo) y propaga el estado a los pedidos vinculados.
   */
  async syncTracking(id: string): Promise<{
    container: ShipmentContainer;
    tracking: TrackingResult;
  }> {
    const c = await this.findById(id);
    const tracking = await this.trackingProvider.track(
      c.containerNumber,
      c.blNumber ?? c.notes,
    );

    c.status = tracking.status;
    if (tracking.etd) c.etd = tracking.etd;
    if (tracking.eta) c.eta = tracking.eta;
    if (tracking.ata) c.ata = tracking.ata;
    const saved = await this.repo.save(c);

    // Propagar automáticamente a los pedidos asignados
    await this.ordersSync.sync(saved);

    return { container: saved, tracking };
  }

  /**
   * Espacio disponible por contenedor abierto (PLANNED/LOADED).
   * usedCbm = cotizaciones activas asignadas + pedidos no cancelados/despachados.
   */
  async availability(): Promise<ContainerAvailability[]> {
    const open = await this.repo.find({
      where: [{ status: 'PLANNED' }, { status: 'LOADED' }],
      order: { createdAt: 'ASC' },
    });
    if (open.length === 0) return [];

    const ids = open.map((c) => c.id);
    const [quotes, orders] = await Promise.all([
      this.quotes.find({
        where: ids.map((id) => ({ containerId: id })),
      }),
      this.orders.find({
        where: ids.map((id) => ({ containerId: id })),
      }),
    ]);

    // Quotes: solo estados que reservan espacio (no REJECTED ni CONVERTED,
    // ya que al convertirse el pedido hereda el containerId y cuenta alli).
    const activeQuoteStatuses = new Set(['DRAFT', 'SENT', 'ACCEPTED']);
    const quoteCbm = new Map<string, Decimal>();
    const quoteKg = new Map<string, Decimal>();
    for (const q of quotes) {
      if (!q.containerId || !activeQuoteStatuses.has(q.status)) continue;
      const t = q.calculationResult?.totals;
      if (!t) continue;
      quoteCbm.set(
        q.containerId,
        (quoteCbm.get(q.containerId) ?? new Decimal(0)).plus(t.cbm),
      );
      quoteKg.set(
        q.containerId,
        (quoteKg.get(q.containerId) ?? new Decimal(0)).plus(t.weightKg ?? 0),
      );
    }

    // Orders: items_snapshot es array de items con cbm; sin peso por item.
    const orderCbm = new Map<string, Decimal>();
    const excluded = new Set(['CANCELLED', 'DISPATCHED']);
    for (const o of orders) {
      if (!o.containerId || excluded.has(o.status)) continue;
      const items = Array.isArray(o.itemsSnapshot)
        ? (o.itemsSnapshot as Array<{ cbm?: string }>)
        : [];
      const cbm = items.reduce(
        (a, it) => a.plus(it.cbm ?? 0),
        new Decimal(0),
      );
      orderCbm.set(
        o.containerId,
        (orderCbm.get(o.containerId) ?? new Decimal(0)).plus(cbm),
      );
    }

    return open.map((c) => {
      const spec = CONTAINER_SPECS[c.containerType];
      const capacityCbm = spec?.usableCbm ?? 0;
      const capacityKg = spec?.maxPayloadKg ?? 0;
      const usedCbm = (quoteCbm.get(c.id) ?? new Decimal(0)).plus(
        orderCbm.get(c.id) ?? 0,
      );
      const usedKg = quoteKg.get(c.id) ?? new Decimal(0);
      return {
        id: c.id,
        containerNumber: c.containerNumber,
        containerType: c.containerType,
        status: c.status,
        capacityCbm,
        capacityKg,
        usedCbm: usedCbm.toString(),
        usedKg: usedKg.toString(),
        remainingCbm: new Decimal(capacityCbm).minus(usedCbm).toString(),
        remainingKg: new Decimal(capacityKg).minus(usedKg).toString(),
      };
    });
  }

  /** Recomendacion de contenedor(s) para una carga (BR-002). */
  optimize(dto: OptimizeLoadDto): LoadOptimization {
    const cbm = new Decimal(dto.totalCbm);
    const kg = new Decimal(dto.totalWeightKg);
    if (!cbm.isFinite() || !kg.isFinite() || cbm.lte(0) || kg.lte(0)) {
      throw new BadRequestException('CBM y peso deben ser numeros positivos');
    }
    return optimizeLoad(cbm, kg);
  }

  /**
   * Demurrage estimado: dias desde ATA (o hoy si no hay ATA) menos
   * dias libres, multiplicado por tarifa diaria. null si no aplica.
   */
  demurrageEstimate(c: ShipmentContainer): {
    daysOverdue: number;
    estimatedCostUsd: string;
  } | null {
    if (c.status === 'DELIVERED' || c.status === 'RETURNED') return null;
    const rate = new Decimal(c.demurrageDailyRateUsd);
    if (rate.lte(0)) return null;

    const start = c.ata ? new Date(c.ata) : new Date();
    const days = Math.max(
      0,
      Math.floor((Date.now() - start.getTime()) / 86400000) -
        c.demurrageFreeDays,
    );
    return {
      daysOverdue: days,
      estimatedCostUsd: rate.mul(days).toDecimalPlaces(2).toString(),
    };
  }
}
