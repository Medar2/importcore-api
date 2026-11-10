import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderPayment } from './entities/order-payment.entity';
import { OrderReminder } from './entities/order-reminder.entity';
import { Quote } from '../landed-cost/entities/quote.entity';
import { ShipmentContainer } from '../shipping/entities/shipment-container.entity';
import { OrdersService } from './application/services/orders.service';
import { DispatchService } from './application/services/dispatch.service';
import { ChangeOrderStatusUseCase } from './application/use-cases/change-order-status.use-case';
import { GetReceivablesAgingUseCase } from './application/use-cases/get-receivables-aging.use-case';
import { SendBalanceRemindersUseCase } from './application/use-cases/send-balance-reminders.use-case';
import { BalanceRemindersScheduler } from './application/schedulers/balance-reminders.scheduler';
import { OrdersController } from './presentation/controllers/orders.controller';
import { ReceivablesController } from './presentation/controllers/receivables.controller';
import { RBacModule } from '../rbac/rbac.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderPayment, OrderReminder, Quote, ShipmentContainer]),
    RBacModule,
    NotificationModule,
  ],
  controllers: [OrdersController, ReceivablesController],
  providers: [
    OrdersService,
    DispatchService,
    ChangeOrderStatusUseCase,
    GetReceivablesAgingUseCase,
    SendBalanceRemindersUseCase,
    BalanceRemindersScheduler,
  ],
  exports: [OrdersService, SendBalanceRemindersUseCase],
})
export class OrdersModule {}
