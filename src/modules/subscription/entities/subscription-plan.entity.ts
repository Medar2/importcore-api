import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { SchemaNames } from '../../../common/constants/schema.constants';
import type { Subscription } from './subscription.entity';

@Entity({ name: 'subscription_plan', schema: SchemaNames.SUBSCRIPTION })
export class SubscriptionPlan extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ length: 20 })
  interval: string; // 'monthly', 'yearly'

  @Column({ type: 'jsonb', nullable: true })
  features: any;

  /** Códigos de app_module incluidos en el plan (ej. ['POS','SALON']) */
  @Column({ type: 'jsonb', nullable: true })
  modules: string[] | null;

  @Column({ default: 'active' })
  status: string;

  @OneToMany('Subscription', (subscription: Subscription) => subscription.plan)
  subscriptions: Subscription[];
}
