import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { ProductsService } from './application/services/products.service';
import { ProductsController } from './presentation/controllers/products.controller';
import { Vendor } from '../vendors/entities/vendor.entity';
import { TariffHeading } from '../tariff-headings/entities/tariff-heading.entity';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Vendor, TariffHeading]),
    StorageModule,
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
