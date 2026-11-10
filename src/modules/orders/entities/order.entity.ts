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
import { Customer } from '../../customers/entities/customer.entity';
import { Quote } from '../../landed-cost/entities/quote.entity';
import { ShipmentContainer } from '../../shipping/entities/shipment-container.entity';

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'IN_TRANSIT'
  | 'ARRIVED'
  | 'READY'
  | 'DISPATCHED'
  | 'CANCELLED';

/** Pedido de importacion (Fase 2). Puede originarse de una cotizacion. */
@Entity({ name: 'orders', schema: SchemaNames.IMPORTCORE })
export class Order extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'order_number', type: 'varchar', length: 30 })
  orderNumber: string;

  @ManyToOne(() => Customer, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  @ManyToOne(() => Quote, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'quote_id' })
  quote: Quote | null;

  @Column({ name: 'quote_id', type: 'uuid', nullable: true })
  quoteId: string | null;

  /** Contenedor asignado (heredado de la cotizacion o explicito). */
  @ManyToOne(() => ShipmentContainer, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'container_id' })
  container: ShipmentContainer | null;

  @Column({ name: 'container_id', type: 'uuid', nullable: true })
  containerId: string | null;

  @Column({ type: 'varchar', length: 20, default: 'PENDING' })
  status: OrderStatus;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency: string;

  /** Total facturable USD (precio cliente si existe, si no landed cost). */
  @Column({ name: 'total_usd', type: 'decimal', precision: 14, scale: 4 })
  totalUsd: string;

  /** Snapshot de items para trazabilidad. */
  @Column({ name: 'items_snapshot', type: 'jsonb', nullable: true })
  itemsSnapshot: unknown;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
