import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { SchemaNames } from '../../../common/constants/schema.constants';
import { PurchaseOrder } from './purchase-order.entity';

export type PurchasePaymentMethod = 'TRANSFER' | 'CASH' | 'CHECK' | 'CARD' | 'OTHER';

/** Pago a proveedor (CxP). Equivalente USD para balance (BR-004). */
@Entity({ name: 'purchase_payments', schema: SchemaNames.IMPORTCORE })
export class PurchasePayment extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @ManyToOne(() => PurchaseOrder, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'purchase_order_id' })
  purchaseOrder: PurchaseOrder;

  @Column({ name: 'purchase_order_id', type: 'uuid' })
  purchaseOrderId: string;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency: string;

  @Column({ type: 'decimal', precision: 14, scale: 4 })
  amount: string;

  @Column({ name: 'amount_usd', type: 'decimal', precision: 14, scale: 4 })
  amountUsd: string;

  @Column({ name: 'exchange_rate', type: 'decimal', precision: 14, scale: 6, nullable: true })
  exchangeRate: string | null;

  @Column({ type: 'varchar', length: 20, default: 'TRANSFER' })
  method: PurchasePaymentMethod;

  @Column({ type: 'varchar', length: 100, nullable: true })
  reference: string | null;

  @Column({ name: 'paid_at', type: 'date' })
  paidAt: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
