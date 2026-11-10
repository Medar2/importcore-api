import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ShipmentContainer } from './entities/shipment-container.entity';
import { Quote } from '../landed-cost/entities/quote.entity';
import { Order } from '../orders/entities/order.entity';
import { OrdersModule } from '../orders/orders.module';
import { ShippingService } from './application/services/shipping.service';
import { ContainerOrdersSyncService } from './application/services/container-orders-sync.service';
import { ShippingController } from './presentation/controllers/shipping.controller';
import { MockTrackingProvider } from './infrastructure/providers/mock-tracking.provider';
import { SeventeenTrackProvider } from './infrastructure/providers/seventeen-track.provider';

@Module({
  imports: [
    TypeOrmModule.forFeature([ShipmentContainer, Quote, Order]),
    OrdersModule,
    ConfigModule,
  ],
  controllers: [ShippingController],
  providers: [
    ShippingService,
    ContainerOrdersSyncService,
    MockTrackingProvider,
    SeventeenTrackProvider,
    {
      provide: 'TRACKING_PROVIDER',
      useFactory: (config: ConfigService) => {
        if (config.get<string>('SEVENTEEN_TRACK_API_KEY')) {
          return new SeventeenTrackProvider(config);
        }
        return new MockTrackingProvider();
      },
      inject: [ConfigService],
    },
  ],
  exports: [ShippingService, 'TRACKING_PROVIDER'],
})
export class ShippingModule {}
