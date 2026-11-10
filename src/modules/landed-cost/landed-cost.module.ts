import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalculateQuoteCostUseCase } from './application/use-cases/calculate-quote-cost.use-case';
import { CreateQuoteUseCase } from './application/use-cases/create-quote.use-case';
import { QuoteQueriesService } from './application/services/quote-queries.service';
import { Quote } from './entities/quote.entity';
import { ShipmentContainer } from '../shipping/entities/shipment-container.entity';
import { Customer } from '../customers/entities/customer.entity';
import { QuotePdfService } from './infrastructure/pdf/quote-pdf.service';
import { LandedCostController } from './presentation/controllers/landed-cost.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Quote, ShipmentContainer, Customer])],
  controllers: [LandedCostController],
  providers: [
    CalculateQuoteCostUseCase,
    CreateQuoteUseCase,
    QuoteQueriesService,
    QuotePdfService,
  ],
})
export class LandedCostModule {}
