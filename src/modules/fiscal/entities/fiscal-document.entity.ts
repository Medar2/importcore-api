import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { SchemaNames } from '../../../common/constants/schema.constants';
import { Order } from '../../orders/entities/order.entity';
import { Customer } from '../../customers/entities/customer.entity';
import type { CancellationType, ECfType, IncomeType } from '../domain/dgii-catalogs';
import type { PaymentBreakdown } from '../domain/invoice-amounts.calculator';

export type FiscalDocumentStatus =
  | 'ACCEPTED'
  | 'CONDITIONAL'
  | 'IN_PROCESS'
  | 'REJECTED'
  | 'CANCELLED';

/** Comprobante fiscal electrónico emitido (BR-005). Alimenta 607 y 608. */
@Entity({ name: 'fiscal_documents', schema: SchemaNames.IMPORTCORE })
export class FiscalDocument extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 13 })
  encf: string;

  @Column({ name: 'ecf_type', type: 'varchar', length: 2 })
  ecfType: ECfType;

  @Index()
  @Column({ name: 'issue_date', type: 'date' })
  issueDate: string;

  @ManyToOne(() => Order, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'order_id' })
  order: Order | null;

  @Index()
  @Column({ name: 'order_id', type: 'uuid', nullable: true })
  orderId: string | null;

  @ManyToOne(() => Customer, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  /** Snapshot del comprador al emitir. */
  @Column({ name: 'buyer_tax_id', type: 'varchar', length: 20, nullable: true })
  buyerTaxId: string | null;

  @Column({ name: 'buyer_name', type: 'varchar', length: 200 })
  buyerName: string;

  @Column({ name: 'income_type', type: 'varchar', length: 2, default: '01' })
  incomeType: IncomeType;

  @Column({ name: 'total_usd', type: 'decimal', precision: 14, scale: 4 })
  totalUsd: string;

  /** DOP por 1 USD usada (BR-004). */
  @Column({ name: 'exchange_rate', type: 'decimal', precision: 14, scale: 6 })
  exchangeRate: string;

  @Column({ name: 'itbis_rate', type: 'decimal', precision: 8, scale: 4 })
  itbisRate: string;

  @Column({ name: 'subtotal_dop', type: 'decimal', precision: 14, scale: 4 })
  subtotalDop: string;

  @Column({ name: 'itbis_dop', type: 'decimal', precision: 14, scale: 4 })
  itbisDop: string;

  @Column({ name: 'total_dop', type: 'decimal', precision: 14, scale: 4 })
  totalDop: string;

  @Column({ name: 'payment_breakdown', type: 'jsonb' })
  paymentBreakdown: PaymentBreakdown;

  @Column({ type: 'varchar', length: 20 })
  status: FiscalDocumentStatus;

  @Column({ type: 'varchar', length: 30 })
  provider: string;

  @Column({ name: 'track_id', type: 'varchar', length: 100, nullable: true })
  trackId: string | null;

  @Column({ name: 'security_code', type: 'varchar', length: 20, nullable: true })
  securityCode: string | null;

  @Column({ name: 'provider_message', type: 'text', nullable: true })
  providerMessage: string | null;

  @Column({ name: 'cancellation_type', type: 'varchar', length: 2, nullable: true })
  cancellationType: CancellationType | null;

  @Column({ name: 'cancellation_reason', type: 'text', nullable: true })
  cancellationReason: string | null;

  @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
  cancelledAt: Date | null;
}
