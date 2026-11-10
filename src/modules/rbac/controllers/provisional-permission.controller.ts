import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { RequirePermission } from '../decorators/require-permission.decorator';
import {
  ProvisionalPermissionService,
  type CreateProvisionalPermissionDto,
  type ApproveProvisionalPermissionDto,
  type RejectProvisionalPermissionDto,
  type ReviewProvisionalPermissionDto,
} from '../services/provisional-permission.service';

@Controller('rbac/permissions/provisional')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProvisionalPermissionController {
  constructor(
    private readonly provisionalPermissionService: ProvisionalPermissionService,
  ) {}

  /**
   * POST /rbac/permissions/provisional
   * Crear permiso provisional
   */
  @Post()
  @RequirePermission('PROVISIONAL_PERMISSION.CREATE')
  async createProvisionalPermission(
    @Body() dto: CreateProvisionalPermissionDto,
    @Req() req: any,
  ) {
    const permission =
      await this.provisionalPermissionService.createProvisionalPermission(
        req.user.id,
        dto,
      );

    return {
      success: true,
      data: permission,
    };
  }

  /**
   * GET /rbac/permissions/provisional
   * Listar permisos provisionales del usuario actual
   */
  @Get()
  @RequirePermission('PROVISIONAL_PERMISSION.READ')
  async getMyProvisionalPermissions(@Req() req: any) {
    const permissions =
      await this.provisionalPermissionService.getUserProvisionalPermissions(
        req.user.id,
      );

    return {
      success: true,
      data: permissions,
      count: permissions.length,
    };
  }

  /**
   * GET /rbac/permissions/provisional/pending
   * Listar permisos pendientes de aprobación (admin)
   */
  @Get('pending')
  @RequirePermission('PROVISIONAL_PERMISSION.APPROVE')
  async listPendingApprovals(@Query('approverId') approverId?: string) {
    const permissions =
      await this.provisionalPermissionService.listPendingApprovals(approverId);

    return {
      success: true,
      data: permissions,
      count: permissions.length,
    };
  }

  /**
   * PUT /rbac/permissions/provisional/:id/approve
   * Aprobar permiso provisional (admin)
   */
  @Put(':id/approve')
  @RequirePermission('PROVISIONAL_PERMISSION.APPROVE')
  async approveProvisionalPermission(
    @Param('id') id: string,
    @Body() dto: ApproveProvisionalPermissionDto,
    @Req() req: any,
  ) {
    const permission =
      await this.provisionalPermissionService.approveProvisionalPermission(id, {
        ...dto,
        approverId: req.user.id,
      });

    return {
      success: true,
      data: permission,
    };
  }

  /**
   * PUT /rbac/permissions/provisional/:id/reject
   * Rechazar permiso provisional (admin)
   */
  @Put(':id/reject')
  @RequirePermission('PROVISIONAL_PERMISSION.APPROVE')
  async rejectProvisionalPermission(
    @Param('id') id: string,
    @Body() dto: RejectProvisionalPermissionDto,
    @Req() req: any,
  ) {
    await this.provisionalPermissionService.rejectProvisionalPermission(id, {
      ...dto,
      approverId: req.user.id,
    });

    return {
      success: true,
      message: `Provisional permission ${id} rejected`,
    };
  }

  /**
   * PUT /rbac/permissions/provisional/:id/review
   * Revisar permiso provisional (admin)
   */
  @Put(':id/review')
  @RequirePermission('PROVISIONAL_PERMISSION.APPROVE')
  async reviewProvisionalPermission(
    @Param('id') id: string,
    @Body() dto: ReviewProvisionalPermissionDto,
    @Req() req: any,
  ) {
    const permission =
      await this.provisionalPermissionService.reviewProvisionalPermission(id, {
        ...dto,
        reviewerId: req.user.id,
      });

    return {
      success: true,
      data: permission,
    };
  }

  /**
   * DELETE /rbac/permissions/provisional/:id
   * Revocar permiso provisional (admin)
   */
  @Delete(':id')
  @RequirePermission('PROVISIONAL_PERMISSION.REVOKE')
  async revokeProvisionalPermission(
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    await this.provisionalPermissionService.revokeProvisionalPermission(
      id,
      reason,
    );

    return {
      success: true,
      message: `Provisional permission ${id} revoked`,
    };
  }
}
