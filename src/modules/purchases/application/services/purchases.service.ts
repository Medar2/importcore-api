import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Decimal } from 'decimal.js';
import { PurchaseOrder } from '../../entities/purchase-order.entity';
import { PurchasePayment } from '../../entities/purchase-payment.entity';
import { convertToUsd } from '../../../currency/domain/convert-to-usd';
import {
  CreatePurchaseOrderDto,
  RegisterPurchasePaymentDto,
  UpdatePurchaseOrderDto,
} from '../../presentation/dtos/purchase.dto';

export interface PurchaseBalance {
  totalUsd: string;
  paidUsd: string;
  balanceUsd: string;
}

@Injectable()
export class PurchasesService {
  constructor(
    @InjectRepository(PurchaseOrder)
    private readonly pos: Repository<PurchaseOrder>,
    @InjectRepository(PurchasePayment)
    private readonly payments: Repository<PurchasePayment>,
  ) {}

  create(dto: CreatePurchaseOrderDto): Promise<PurchaseOrder> {
    return this.pos.save(
      this.pos.create({
        poNumber: this.nextPoNumber(),
        vendorId: dto.vendorId,
        orderId: dto.orderId ?? null,
        status: 'DRAFT',
        currency: 'USD',
        totalUsd: dto.totalUsd ?? '0',
        itemsSnapshot: dto.items ?? null,
        expectedDate: dto.expectedDate ?? null,
        notes: dto.notes ?? null,
      }),
    );
  }

  findAll(status?: string): Promise<PurchaseOrder[]> {
    return this.pos.find({
      where: status ? { status: status as PurchaseOrder['status'] } : {},
      relations: ['vendor'],
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<PurchaseOrder> {
    const po = await this.pos.findOne({
      where: { id },
      relations: ['vendor', 'order'],
    });
    if (!po) throw new NotFoundException('Orden de compra no encontrada');
    return po;
  }

  async update(id: string, dto: UpdatePurchaseOrderDto): Promise<PurchaseOrder> {
    const po = await this.findById(id);
    if (po.status === 'RECEIVED' || po.status === 'CANCELLED') {
      throw new ConflictException('No se puede editar una OC cerrada');
    }
    Object.assign(po, {
      status: dto.status ?? po.status,
      totalUsd: dto.totalUsd ?? po.totalUsd,
      itemsSnapshot: dto.items !== undefined ? dto.items : po.itemsSnapshot,
      expectedDate: dto.expectedDate ?? po.expectedDate,
      notes: dto.notes ?? po.notes,
    });
    return this.pos.save(po);
  }

  async balance(id: string): Promise<PurchaseBalance> {
    const po = await this.findById(id);
    const paid = await this.payments
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.amount_usd), 0)', 'total')
      .where('p.purchase_order_id = :id', { id })
      .getRawOne<{ total: string }>();

    const total = new Decimal(po.totalUsd);
    const paidUsd = new Decimal(paid?.total ?? 0);
    return {
      totalUsd: total.toString(),
      paidUsd: paidUsd.toString(),
      balanceUsd: total.minus(paidUsd).toString(),
    };
  }

  async registerPayment(
    id: string,
    dto: RegisterPurchasePaymentDto,
  ): Promise<PurchasePayment> {
    const po = await this.findById(id);
    if (po.status === 'CANCELLED' || po.status === 'RECEIVED') {
      throw new BadRequestException('No se pueden registrar pagos en este estado');
    }

    const currency = dto.currency ?? 'USD';
    const conv = convertToUsd(dto.amount, currency, dto.exchangeRateToUsd);
    if (!conv.ok) throw new BadRequestException(conv.error);

    return this.payments.save(
      this.payments.create({
        purchaseOrderId: id,
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
  }

  private nextPoNumber(): string {
    const d = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `OC-${d}-${rand}`;
  }
}
