import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NcfSequence } from './entities/ncf-sequence.entity';
import { FiscalDocument } from './entities/fiscal-document.entity';
import { FiscalPurchase } from './entities/fiscal-purchase.entity';
import { OrderPayment } from '../orders/entities/order-payment.entity';
import { OrdersModule } from '../orders/orders.module';
import { CurrencyModule } from '../currency/currency.module';
import { ConfigModule as AppConfigModule } from '../config/config.module';
import { ecfProviderFactory } from './infrastructure/providers/ecf-provider.factory';
import { NcfSequenceRepository } from './infrastructure/repositories/ncf-sequence.repository';
import { FiscalCompanyService } from './application/services/fiscal-company.service';
import { FiscalDocumentsService } from './application/services/fiscal-documents.service';
import { FiscalPurchasesService } from './application/services/fiscal-purchases.service';
import { NcfSequencesService } from './application/services/ncf-sequences.service';
import { OrderPaymentsDopService } from './application/services/order-payments-dop.service';
import { EmitOrderInvoiceUseCase } from './application/use-cases/emit-order-invoice.use-case';
import { CancelFiscalDocumentUseCase } from './application/use-cases/cancel-fiscal-document.use-case';
import { GenerateDgiiReportUseCase } from './application/use-cases/generate-dgii-report.use-case';
import { FiscalDocumentsController } from './presentation/controllers/fiscal-documents.controller';
import { FiscalSetupController } from './presentation/controllers/fiscal-setup.controller';
import { DgiiReportsController } from './presentation/controllers/dgii-reports.controller';

/** M8: e-CF vía proveedor (adaptador) y reportes DGII 606/607/608. */
@Module({
  imports: [
    TypeOrmModule.forFeature([NcfSequence, FiscalDocument, FiscalPurchase, OrderPayment]),
    OrdersModule,
    CurrencyModule,
    AppConfigModule,
  ],
  controllers: [FiscalDocumentsController, FiscalSetupController, DgiiReportsController],
  providers: [
    ecfProviderFactory,
    NcfSequenceRepository,
    FiscalCompanyService,
    FiscalDocumentsService,
    FiscalPurchasesService,
    NcfSequencesService,
    OrderPaymentsDopService,
    EmitOrderInvoiceUseCase,
    CancelFiscalDocumentUseCase,
    GenerateDgiiReportUseCase,
  ],
})
export class FiscalModule {}
