import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExchangeRate } from './entities/exchange-rate.entity';
import { ExchangeRatesService } from './application/services/exchange-rates.service';
import { ExchangeRatesController } from './presentation/controllers/exchange-rates.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ExchangeRate])],
  controllers: [ExchangeRatesController],
  providers: [ExchangeRatesService],
  exports: [TypeOrmModule, ExchangeRatesService],
})
export class CurrencyModule {}
