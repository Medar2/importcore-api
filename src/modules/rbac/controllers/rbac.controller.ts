import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { RBACService } from '../services/rbac.service';
import { PermissionVerificationService } from '../services/permission-verification.service';
import { PermissionDelegationService } from '../services/permission-delegation.service';
import {
  CheckPermissionDto,
  CheckPermissionBatchDto,
  AssignPermissionDto,
  DelegatePermissionsDto,
  RevokeDelegationDto,
} from '../dto';

@Controller('rbac')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RBACController {
  constructor(
    private readonly rbacService: RBACService,
    private readonly permissionVerificationService: PermissionVerificationService,
    private readonly delegationService: PermissionDelegationService,
  ) {}

  // ==================== Permission Endpoints ====================

  @Get('permissions')
  async getMyPermissions(@CurrentUser() user: any) {
    const permissions =
      await this.permissionVerificationService.getUserPermissions(user.id);
    return {
      userId: user.id,
      permissions,
    };
  }

  @Post('permissions/check')
  @HttpCode(HttpStatus.OK)
  async checkPermission(
    @CurrentUser() user: any,
    @Body() dto: CheckPermissionDto,
  ) {
    const hasPermission =
      await this.permissionVerificationService.hasPermission(
        user.id,
        dto.permissionCode,
        dto.context,
      );
    return {
      permissionCode: dto.permissionCode,
      hasPermission,
    };
  }

  @Post('permissions/check-batch')
  @HttpCode(HttpStatus.OK)
  async checkPermissionBatch(
    @CurrentUser() user: any,
    @Body() dto: CheckPermissionBatchDto,
  ) {
    const results = await Promise.all(
      dto.permissionCodes.map(async (permissionCode) => {
        const hasPermission =
          await this.permissionVerificationService.hasPermission(
            user.id,
            permissionCode,
            dto.context,
          );
        return {
          permissionCode,
          hasPermission,
        };
      }),
    );
    return { results };
  }

  @Get('users/:id/permissions')
  @RequirePermission('RBAC.USERS.READ')
  async getUserPermissions(@Param('id') userId: string) {
    const permissions =
      await this.permissionVerificationService.getUserPermissions(userId);
    return {
      userId,
      permissions,
    };
  }

  @Post('users/:id/permissions')
  @RequirePermission('RBAC.PERMISSIONS.ASSIGN')
  async assignPermissionToUser(
    @Param('id') userId: string,
    @Body() dto: AssignPermissionDto,
    @CurrentUser() _user: any,
  ) {
    const permission = await this.rbacService.assignPermissionToUser(
      userId,
      dto.permissionCode,
      {
        context: dto.context,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
    );
    return {
      message: 'Permission assigned successfully',
      permission,
    };
  }

  @Delete('users/:id/permissions/:permId')
  @RequirePermission('RBAC.PERMISSIONS.REVOKE')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeUserPermission(
    @Param('id') userId: string,
    @Param('permId') permissionId: string,
  ) {
    await this.rbacService.revokeUserPermission(permissionId);
  }

  // ==================== Delegation Endpoints ====================

  @Post('permissions/delegate')
  @RequirePermission('RBAC.PERMISSIONS.DELEGATE')
  async delegatePermissions(
    @CurrentUser() user: any,
    @Body() dto: DelegatePermissionsDto,
  ) {
    const delegation = await this.delegationService.delegatePermissions(
      user.id,
      dto.delegateId,
      dto.permissionCodes,
      new Date(dto.startsAt),
      new Date(dto.expiresAt),
    );
    return {
      message: 'Permissions delegated successfully',
      delegation,
    };
  }

  @Get('delegations')
  async getMyDelegations(@CurrentUser() user: any) {
    const delegations = await this.delegationService.getActiveDelegations(
      user.id,
    );
    return delegations;
  }

  @Delete('delegations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeDelegation(
    @Param('id') delegationId: string,
    @Body() dto: RevokeDelegationDto,
  ) {
    await this.delegationService.revokeDelegation(delegationId, dto.reason);
  }
}
