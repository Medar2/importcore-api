import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../rbac/guards/permissions.guard';
import { RequirePermission } from '../../rbac/decorators/require-permission.decorator';
import {
  MigrationService,
  LegacyUser,
  LegacyRole,
  MigrationResult,
} from '../services/migration.service';

interface ExecuteMigrationDto {
  users?: LegacyUser[];
  roles?: LegacyRole[];
  permissions?: { codigo: string; descripcion: string }[];
  organizations?: { name: string; slug: string; description?: string }[];
  userRoles?: { userEmail: string; roleNames: string[] }[];
}

@Controller('migration')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MigrationController {
  constructor(private readonly migrationService: MigrationService) {}

  /**
   * POST /migration/execute
   * Ejecuta una migración completa
   */
  @Post('execute')
  @RequirePermission('SYSTEM.MIGRATION.EXECUTE')
  async executeMigration(
    @Body() dto: ExecuteMigrationDto,
    @Req() req: any,
  ): Promise<MigrationResult> {
    const result = await this.migrationService.executeFullMigration(dto, {
      defaultOrganizationId: req.user.organizationId,
    });

    return result;
  }

  /**
   * POST /migration/users
   * Migra solo usuarios
   */
  @Post('users')
  @RequirePermission('SYSTEM.MIGRATION.EXECUTE')
  async migrateUsers(
    @Body() dto: { users: LegacyUser[]; defaultOrganizationId?: string },
  ): Promise<{ migrated: number }> {
    const migrated = await this.migrationService.migrateUsers(
      dto.users,
      dto.defaultOrganizationId,
    );

    return { migrated };
  }

  /**
   * POST /migration/roles
   * Migra solo roles
   */
  @Post('roles')
  @RequirePermission('SYSTEM.MIGRATION.EXECUTE')
  async migrateRoles(
    @Body() dto: { roles: LegacyRole[] },
  ): Promise<{ migrated: number }> {
    const migrated = await this.migrationService.migrateRoles(dto.roles);

    return { migrated };
  }

  /**
   * POST /migration/permissions
   * Migra solo permisos
   */
  @Post('permissions')
  @RequirePermission('SYSTEM.MIGRATION.EXECUTE')
  async migratePermissions(
    @Body() dto: { permissions: { codigo: string; descripcion: string }[] },
  ): Promise<{ migrated: number }> {
    const migrated = await this.migrationService.migratePermissions(
      dto.permissions,
    );

    return { migrated };
  }

  /**
   * POST /migration/validate
   * Valida que la migración fue exitosa
   */
  @Post('validate')
  @RequirePermission('SYSTEM.MIGRATION.EXECUTE')
  async validateMigration(): Promise<{ valid: boolean; issues: string[] }> {
    return this.migrationService.validateMigration();
  }
}
