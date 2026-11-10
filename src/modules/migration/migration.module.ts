import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MigrationService } from './services/migration.service';
import { MigrationController } from './controllers/migration.controller';
import { User } from '../security/entities/user.entity';
import { Role } from '../security/entities/role.entity';
import { Permission } from '../security/entities/permission.entity';
import { Organization } from '../organization/entities/organization.entity';
import { RBacModule } from '../rbac/rbac.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Role, Permission, Organization]),
    RBacModule,
  ],
  controllers: [MigrationController],
  providers: [MigrationService],
  exports: [MigrationService],
})
export class MigrationModule {}
