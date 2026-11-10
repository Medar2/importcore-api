import {
  BadRequestException,
  ConflictException,
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
