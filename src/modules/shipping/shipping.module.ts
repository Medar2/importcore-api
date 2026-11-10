import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShipmentContainer } from './entities/shipment-container.entity';
import { Quote } from '../landed-cost/entities/quote.entity';
import { Order } from '../orders/entities/order.entity';
import { OrdersModule } from '../orders/orders.module';
import { ShippingService } from './application/services/shipping.service';
import { ContainerOrdersSyncService } from './application/services/container-orders-sync.service';
import { ShippingController } from './presentation/controllers/shipping.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ShipmentContainer, Quote, Order]), OrdersModule],
  controllers: [ShippingController],
  providers: [ShippingService, ContainerOrdersSyncService],
  exports: [ShippingService],
})
export class ShippingModule {}
