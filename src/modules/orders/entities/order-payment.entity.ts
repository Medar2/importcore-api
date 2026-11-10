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
import { Order } from './order.entity';

export type PaymentMethod = 'TRANSFER' | 'CASH' | 'CHECK' | 'CARD' | 'OTHER';

/**
 * Pago/anticipo del cliente (CxC, Fase 2, BR-004).
 * Guarda moneda original + equivalente USD para el balance.
 */
@Entity({ name: 'order_payments', schema: SchemaNames.IMPORTCORE })
export class OrderPayment extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency: string;

  /** Monto en la moneda original. */
  @Column({ type: 'decimal', precision: 14, scale: 4 })
  amount: string;

  /** Equivalente en USD usado para el balance (dispatch lock). */
  @Column({ name: 'amount_usd', type: 'decimal', precision: 14, scale: 4 })
  amountUsd: string;

  /** Tasa aplicada para la conversion (trazabilidad BR-004). */
  @Column({ name: 'exchange_rate', type: 'decimal', precision: 14, scale: 6, nullable: true })
  exchangeRate: string | null;

  @Column({ type: 'varchar', length: 20, default: 'TRANSFER' })
  method: PaymentMethod;

  @Column({ type: 'varchar', length: 100, nullable: true })
  reference: string | null;

  @Column({ name: 'paid_at', type: 'date' })
  paidAt: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
