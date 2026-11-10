import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TariffHeading } from './entities/tariff-heading.entity';
import { TariffHeadingsService } from './application/services/tariff-headings.service';
import { TariffHeadingsController } from './presentation/controllers/tariff-headings.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TariffHeading])],
  controllers: [TariffHeadingsController],
  providers: [TariffHeadingsService],
  exports: [TariffHeadingsService],
})
export class TariffHeadingsModule {}
