import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from './entities/organization.entity';
import { Company } from './entities/company.entity';
import { User } from '../security/entities/user.entity';
import { OrganizationService } from './services/organization.service';
import { CompanyService } from './services/company.service';
import { OrganizationController } from './controllers/organization.controller';
import { CompanyController } from './controllers/company.controller';
import { OrganizationGuard } from './guards/organization.guard';
import { CacheModule } from '../cache/cache.module';
import { AuditModule } from '../audit/audit.module';
import { RBacModule } from '../rbac/rbac.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Organization, Company, User]),
    CacheModule,
    AuditModule,
    RBacModule,
    StorageModule,
  ],
  controllers: [OrganizationController, CompanyController],
  providers: [OrganizationService, CompanyService, OrganizationGuard],
  exports: [OrganizationService, CompanyService, OrganizationGuard],
})
export class OrganizationModule {}
