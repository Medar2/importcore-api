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
import type { ReminderTrigger } from '../domain/balance-reminder.policy';

/** Recordatorio de saldo enviado (M7). Uno por pedido y disparador. */
@Entity({ name: 'order_reminders', schema: SchemaNames.IMPORTCORE })
@Index(['orderId', 'trigger'], { unique: true })
export class OrderReminder extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @Column({ type: 'varchar', length: 30 })
  trigger: ReminderTrigger;

  @Column({ type: 'varchar', length: 20, default: 'EMAIL' })
  channel: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  recipient: string | null;

  /** Saldo al momento del envío. */
  @Column({ name: 'balance_usd', type: 'decimal', precision: 14, scale: 4 })
  balanceUsd: string;
}
