import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vendor } from './entities/vendor.entity';
import { VendorsService } from './application/services/vendors.service';
import { VendorsController } from './presentation/controllers/vendors.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Vendor])],
  controllers: [VendorsController],
  providers: [VendorsService],
  exports: [VendorsService],
})
export class VendorsModule {}
