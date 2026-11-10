import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { PurchasePayment } from './entities/purchase-payment.entity';
import { PurchasesService } from './application/services/purchases.service';
import { PurchasesController } from './presentation/controllers/purchases.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PurchaseOrder, PurchasePayment])],
  controllers: [PurchasesController],
  providers: [PurchasesService],
  exports: [PurchasesService],
})
export class PurchasesModule {}
