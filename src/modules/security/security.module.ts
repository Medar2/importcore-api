import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';

import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { PeopleModule } from '../people/people.module';
import { RBacModule } from '../rbac/rbac.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationModule } from '../notification/notification.module';
import { RolesService } from './services/roles.service';
import { PermissionsService } from './services/permissions.service';
import { RolesController } from './controllers/roles.controller';
import { PermissionsController } from './controllers/permissions.controller';
import { UsersService } from './services/users.service';
import { UsersController } from './controllers/users.controller';
import { UserAccessController } from './controllers/user-access.controller';
import { UserAccessService } from './application/user-access.service';
import { UserPermission } from './entities/user-permission.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Role, Permission, UserPermission]),
    PeopleModule,
    RBacModule,
    NotificationModule,
    forwardRef(() => AuthModule),
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [RolesController, PermissionsController, UserAccessController, UsersController],
  providers: [RolesService, PermissionsService, UsersService, UserAccessService],
  exports: [TypeOrmModule, RolesService, PermissionsService, UsersService],
})
export class SecurityModule {}
