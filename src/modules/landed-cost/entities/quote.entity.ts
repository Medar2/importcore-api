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
import { ShipmentContainer } from '../../shipping/entities/shipment-container.entity';
import { Customer } from '../../customers/entities/customer.entity';
import type { QuoteComputationResult } from '../presentation/dtos/quote-calculation-result.dto';

export type QuoteStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'CONVERTED';

/**
 * Cotizacion de landed cost (M3). Persiste el resultado completo del
 * calculo para trazabilidad y posterior conversion a pedido.
 */
@Entity({ name: 'quotes', schema: SchemaNames.IMPORTCORE })
export class Quote extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'quote_number', type: 'varchar', length: 30 })
  quoteNumber: string;

  @Column({ name: 'customer_name', type: 'varchar', length: 200, nullable: true })
  customerName: string | null;

  @Column({ type: 'varchar', length: 20, default: 'DRAFT' })
  status: QuoteStatus;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency: string;

  /** Snapshot del request original para reproducibilidad. */
  @Column({ name: 'request_snapshot', type: 'jsonb' })
  requestSnapshot: unknown;

  /** Resultado completo del motor de landed cost. */
  @Column({ name: 'calculation_result', type: 'jsonb' })
  calculationResult: QuoteComputationResult;

  @Column({ name: 'landed_cost_usd', type: 'decimal', precision: 14, scale: 4 })
  landedCostUsd: string;

  @Column({ name: 'customer_price_usd', type: 'decimal', precision: 14, scale: 4, nullable: true })
  customerPriceUsd: string | null;

  @Column({ name: 'valid_until', type: 'date', nullable: true })
  validUntil: string | null;

  /** Cliente registrado vinculado (si aplica; customerName se mantiene como snapshot). */
  @ManyToOne(() => Customer, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer | null;

  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  customerId: string | null;

  /** Contenedor existente asignado (consolidacion de carga). */
  @ManyToOne(() => ShipmentContainer, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'container_id' })
  container: ShipmentContainer | null;

  @Column({ name: 'container_id', type: 'uuid', nullable: true })
  containerId: string | null;
}
