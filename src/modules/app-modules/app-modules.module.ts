import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppModule } from './entities/app-module.entity';
import { OrganizationAppModule } from './entities/organization-app-module.entity';
import { AppModulesService } from './services/app-modules.service';
import { AppModulesController } from './controllers/app-modules.controller';
import { ModuleAccessGuard } from './guards/module-access.guard';
import { SecurityModule } from '../security/security.module';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([AppModule, OrganizationAppModule]),
    SecurityModule,
  ],
  controllers: [AppModulesController],
  providers: [AppModulesService, ModuleAccessGuard],
  exports: [AppModulesService, ModuleAccessGuard],
})
export class AppModulesModule {}
