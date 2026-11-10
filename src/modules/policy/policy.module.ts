import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Policy } from './entities/policy.entity';
import { PolicyService } from './services/policy.service';
import { PolicyEngine } from './services/policy-engine.service';
import { PolicyController } from './controllers/policy.controller';
import { PolicyGuard } from './guards/policy.guard';
import { CacheModule } from '../cache/cache.module';
import { AuditModule } from '../audit/audit.module';
import { RBacModule } from '../rbac/rbac.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Policy]),
    CacheModule,
    AuditModule,
    RBacModule,
  ],
  controllers: [PolicyController],
  providers: [PolicyService, PolicyEngine, PolicyGuard],
  exports: [PolicyService, PolicyEngine, PolicyGuard],
})
export class PolicyModule {}
