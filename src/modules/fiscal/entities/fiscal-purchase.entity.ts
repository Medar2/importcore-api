import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { SchemaNames } from '../../../common/constants/schema.constants';
import { PurchaseOrder } from '../../purchases/entities/purchase-order.entity';
import type {
  GoodsServicesType,
  IsrWithholdingType,
  PurchasePaymentMethodCode,
  TaxIdType,
} from '../domain/dgii-catalogs';

/**
 * Comprobante de compra/gasto local recibido (naviera, agente aduanal,
 * transporte…). Fuente del 606. Montos en DOP.
 */
@Entity({ name: 'fiscal_purchases', schema: SchemaNames.IMPORTCORE })
@Index(['supplierTaxId', 'ncf'], { unique: true })
export class FiscalPurchase extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'supplier_tax_id', type: 'varchar', length: 11 })
  supplierTaxId: string;

  @Column({ name: 'supplier_tax_id_type', type: 'varchar', length: 1 })
  supplierTaxIdType: TaxIdType;

  @Column({ name: 'supplier_name', type: 'varchar', length: 200 })
  supplierName: string;

  @Column({ name: 'goods_services_type', type: 'varchar', length: 2 })
  goodsServicesType: GoodsServicesType;

  @Column({ type: 'varchar', length: 13 })
  ncf: string;

  @Column({ name: 'modified_ncf', type: 'varchar', length: 13, nullable: true })
  modifiedNcf: string | null;

  @Index()
  @Column({ name: 'invoice_date', type: 'date' })
  invoiceDate: string;

  @Column({ name: 'payment_date', type: 'date', nullable: true })
  paymentDate: string | null;

  @Column({ name: 'services_amount', type: 'decimal', precision: 14, scale: 4, default: '0' })
  servicesAmount: string;

  @Column({ name: 'goods_amount', type: 'decimal', precision: 14, scale: 4, default: '0' })
  goodsAmount: string;

  @Column({ name: 'itbis_billed', type: 'decimal', precision: 14, scale: 4, default: '0' })
  itbisBilled: string;

  @Column({ name: 'itbis_withheld', type: 'decimal', precision: 14, scale: 4, default: '0' })
  itbisWithheld: string;

  @Column({ name: 'itbis_to_cost', type: 'decimal', precision: 14, scale: 4, default: '0' })
  itbisToCost: string;

  @Column({ name: 'isr_withholding_type', type: 'varchar', length: 2, nullable: true })
  isrWithholdingType: IsrWithholdingType | null;

  @Column({ name: 'isr_withheld', type: 'decimal', precision: 14, scale: 4, default: '0' })
  isrWithheld: string;

  @Column({ name: 'selective_tax', type: 'decimal', precision: 14, scale: 4, default: '0' })
  selectiveTax: string;

  @Column({ name: 'other_taxes', type: 'decimal', precision: 14, scale: 4, default: '0' })
  otherTaxes: string;

  @Column({ name: 'legal_tip', type: 'decimal', precision: 14, scale: 4, default: '0' })
  legalTip: string;

  @Column({ name: 'payment_method', type: 'varchar', length: 2 })
  paymentMethod: PurchasePaymentMethodCode;

  /** Asignación opcional a una OC (costo del contenedor/pedido). */
  @ManyToOne(() => PurchaseOrder, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'purchase_order_id' })
  purchaseOrder: PurchaseOrder | null;

  @Column({ name: 'purchase_order_id', type: 'uuid', nullable: true })
  purchaseOrderId: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
