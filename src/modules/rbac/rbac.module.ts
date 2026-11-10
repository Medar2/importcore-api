import { Module, forwardRef, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../security/entities/user.entity';
import { Role } from '../security/entities/role.entity';
import { Permission } from '../security/entities/permission.entity';
import { UserPermission } from '../security/entities/user-permission.entity';
import { RolePermission } from '../security/entities/role-permission.entity';
import { PermissionDelegation } from '../security/entities/permission-delegation.entity';
import { RBACService } from './services/rbac.service';
import { PermissionDelegationService } from './services/permission-delegation.service';
import { PermissionVerificationService } from './services/permission-verification.service';
import { OwnershipService } from './services/ownership.service';
import { ProvisionalPermissionService } from './services/provisional-permission.service';
import { PermissionsGuard } from './guards/permissions.guard';
import { OwnershipGuard } from './guards/ownership.guard';
import { RBACController } from './controllers/rbac.controller';
import { RoleController } from './controllers/role.controller';
import { ProvisionalPermissionController } from './controllers/provisional-permission.controller';
import { CacheModule } from '../cache/cache.module';
import { AuditModule } from '../audit/audit.module';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Role,
      Permission,
      UserPermission,
      RolePermission,
      PermissionDelegation,
    ]),
    CacheModule,
    forwardRef(() => AuditModule),
  ],
  controllers: [
    RBACController,
    RoleController,
    ProvisionalPermissionController,
  ],
  providers: [
    RBACService,
    PermissionDelegationService,
    PermissionVerificationService,
    OwnershipService,
    ProvisionalPermissionService,
    PermissionsGuard,
    OwnershipGuard,
  ],
  exports: [
    RBACService,
    PermissionDelegationService,
    PermissionVerificationService,
    OwnershipService,
    ProvisionalPermissionService,
    PermissionsGuard,
    OwnershipGuard,
  ],
})
export class RBacModule {}
