import {
  Controller,
  Get,
  Query,
  UseGuards,
  Param,
  Res,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../rbac/guards/permissions.guard';
import { RequirePermission } from '../../rbac/decorators/require-permission.decorator';
import { AuditService, AuditFilters } from '../services/audit.service';

@Controller('audit')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * GET /audit/logs
   * Consultar logs con filtros (admin)
   */
  @Get('logs')
  @RequirePermission('ADMINISTRACION.AUDITORIA.VER')
  async getLogs(
    @Query('userId') userId?: string,
    @Query('userEmail') userEmail?: string,
    @Query('organizationId') organizationId?: string,
    @Query('action') action?: string,
    @Query('resource') resource?: string,
    @Query('result') result?: 'success' | 'failure' | 'denied',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filters: AuditFilters = {
      userId,
      userEmail,
      organizationId,
      action,
      resource,
      result,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };

    const logs = await this.auditService.queryLogs(filters);

    return {
      success: true,
      data: logs,
      count: logs.length,
    };
  }

  /**
   * GET /audit/logs/export
   * Exportar logs en JSON o CSV (admin)
   */
  @Get('logs/export')
  @RequirePermission('ADMINISTRACION.AUDITORIA.VER')
  async exportLogs(
    @Query('format') format: 'json' | 'csv' = 'json',
    @Query('userId') userId?: string,
    @Query('userEmail') userEmail?: string,
    @Query('organizationId') organizationId?: string,
    @Query('action') action?: string,
    @Query('resource') resource?: string,
    @Query('result') result?: 'success' | 'failure' | 'denied',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Res() res?: Response,
  ) {
    const filters: AuditFilters = {
      userId,
      userEmail,
      organizationId,
      action,
      resource,
      result,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };

    const buffer = await this.auditService.exportLogs(filters, format);

    const filename = `audit-logs-${new Date().toISOString()}.${format}`;
    const contentType = format === 'json' ? 'application/json' : 'text/csv';

    if (res) {
      res.setHeader('Content-Type', contentType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );
      res.status(HttpStatus.OK).send(buffer);
    }

    return { success: true, message: 'Export completed' };
  }

  /**
   * GET /audit/stats
   * Obtener estadísticas de auditoría (admin)
   */
  @Get('stats')
  @RequirePermission('ADMINISTRACION.AUDITORIA.VER')
  async getStats(
    @Query('userId') userId?: string,
    @Query('userEmail') userEmail?: string,
    @Query('organizationId') organizationId?: string,
    @Query('action') action?: string,
    @Query('resource') resource?: string,
    @Query('result') result?: 'success' | 'failure' | 'denied',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filters: AuditFilters = {
      userId,
      userEmail,
      organizationId,
      action,
      resource,
      result,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };

    const stats = await this.auditService.getStats(filters);

    return {
      success: true,
      data: stats,
    };
  }

  /**
   * GET /audit/users/:id/activity
   * Actividad de un usuario (admin)
   */
  @Get('users/:id/activity')
  @RequirePermission('ADMINISTRACION.AUDITORIA.VER')
  async getUserActivity(
    @Param('id') userId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filters: AuditFilters = {
      userId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };

    const logs = await this.auditService.queryLogs(filters);
    const stats = await this.auditService.getStats(filters);

    return {
      success: true,
      data: {
        userId,
        logs,
        stats,
      },
    };
  }
}
