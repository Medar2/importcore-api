import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import type { PaymentMethod } from '../../entities/order-payment.entity';
import type { OrderStatus } from '../../entities/order.entity';

const METHODS: PaymentMethod[] = ['TRANSFER', 'CASH', 'CHECK', 'CARD', 'OTHER'];

export class CreateOrderDto {
  /** Obligatorio sin quoteId; con quoteId se hereda el de la cotizacion si existe. */
  @IsOptional()
  @IsUUID()
  customerId?: string;

  /** Si se indica, copia totales e items de la cotizacion. */
  @IsOptional()
  @IsUUID()
  quoteId?: string;

  /** Contenedor existente; si se omite se hereda el de la cotizacion. */
  @IsOptional()
  @IsUUID()
  containerId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class RegisterPaymentDto {
  /** Monto en la moneda indicada. */
  @IsNotEmpty()
  amount: string;

  @IsOptional()
  @IsIn(['USD', 'DOP', 'CNY'])
  currency?: string;

  /** Tasa a USD por unidad de `currency`. Requerida si currency != USD. */
  @IsOptional()
  @IsNotEmpty()
  exchangeRateToUsd?: string;

  @IsOptional()
  @IsIn(METHODS)
  method?: PaymentMethod;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string;

  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

/** DISPATCHED no se acepta aquí: va por POST /orders/:id/dispatch (BR-003). */
export class ChangeOrderStatusDto {
  @IsIn(['CONFIRMED', 'IN_TRANSIT', 'ARRIVED', 'READY', 'CANCELLED'])
  status: Exclude<OrderStatus, 'PENDING' | 'DISPATCHED'>;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

/** Body del endpoint de despacho (BR-003). */
export class DispatchOrderDto {
  /** Requerido solo si hay balance pendiente y el usuario tiene override. */
  @IsOptional()
  @IsString()
  overrideReason?: string;
}
