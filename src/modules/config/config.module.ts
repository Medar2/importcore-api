import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemConfig } from './entities/system-config.entity';
import { SystemConfigService } from './services/system-config.service';
import { SystemConfigController } from './controllers/system-config.controller';
import { SecurityModule } from '../security/security.module';
import { DateTimeService } from './services/date-time.service';

@Module({
  imports: [TypeOrmModule.forFeature([SystemConfig]), SecurityModule],
  controllers: [SystemConfigController],
  providers: [SystemConfigService, DateTimeService],
  exports: [SystemConfigService, DateTimeService, TypeOrmModule],
})
export class ConfigModule {}
