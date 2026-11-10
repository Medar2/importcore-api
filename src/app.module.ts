import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { PeopleModule } from './modules/people/people.module';
import { SecurityModule } from './modules/security/security.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';
import { ConfigModule as AppConfigModule } from './modules/config/config.module';
import { OrganizationModule } from './modules/organization/organization.module';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { CacheModule } from './modules/cache/cache.module';
import { AuthModule } from './modules/auth/auth.module';
import { RBacModule } from './modules/rbac/rbac.module';
import { PolicyModule } from './modules/policy/policy.module';
import { AuditModule } from './modules/audit/audit.module';
import { NotificationModule } from './modules/notification/notification.module';
import { RateLimitModule } from './modules/rate-limit/rate-limit.module';
import { MigrationModule } from './modules/migration/migration.module';
import { AppModulesModule } from './modules/app-modules/app-modules.module';
import { CurrencyModule } from './modules/currency/currency.module';
import { CustomersModule } from './modules/customers/customers.module';
import { LandedCostModule } from './modules/landed-cost/landed-cost.module';
import { OrdersModule } from './modules/orders/orders.module';
import { ProductsModule } from './modules/products/products.module';
import { PurchasesModule } from './modules/purchases/purchases.module';
import { ShippingModule } from './modules/shipping/shipping.module';
import { TariffHeadingsModule } from './modules/tariff-headings/tariff-headings.module';
import { VendorsModule } from './modules/vendors/vendors.module';
import { FiscalModule } from './modules/fiscal/fiscal.module';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    CacheModule,
    PeopleModule,
    AuthModule,
    RBacModule,
    PolicyModule,
    AuditModule,
    NotificationModule,
    OrganizationModule,
    RateLimitModule,
    MigrationModule,
    SecurityModule,
    SubscriptionModule,
    AppConfigModule,
    AppModulesModule,
    CurrencyModule,
    CustomersModule,
    LandedCostModule,
    OrdersModule,
    ProductsModule,
    PurchasesModule,
    ShippingModule,
    TariffHeadingsModule,
    VendorsModule,
    FiscalModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
