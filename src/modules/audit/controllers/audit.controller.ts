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
import { SessionAuditService } from '../services/session-audit.service';

@Controller('audit')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AuditController {
  constructor(
    private readonly auditService: AuditService,
    private readonly sessionAuditService: SessionAuditService,
  ) {}

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

  /**
   * GET /audit/sessions
   * Listar sesiones (activas e históricas) con tiempo en sesión
   */
  @Get('sessions')
  @RequirePermission('ADMINISTRACION.AUDITORIA.VER')
  async listSessions(
    @Query('userId') userId?: string,
    @Query('isActive') isActive?: string,
    @Query('closeReason') closeReason?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.sessionAuditService.listSessions({
      userId,
      isActive:
        isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      closeReason,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });

    return { success: true, ...result };
  }

  /**
   * GET /audit/sessions/user/:userId
   * Historial de sesiones de un usuario
   */
  @Get('sessions/user/:userId')
  @RequirePermission('ADMINISTRACION.AUDITORIA.VER')
  async getUserSessions(
    @Param('userId') userId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const sessions = await this.sessionAuditService.getUserSessions(userId, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    return { success: true, data: sessions, count: sessions.length };
  }

  /**
   * GET /audit/sessions/summary
   * Resumen de tiempo en sesión por usuario
   */
  @Get('sessions/summary')
  @RequirePermission('ADMINISTRACION.AUDITORIA.VER')
  async getSessionsSummary(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const summary = await this.sessionAuditService.getSummary({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    return { success: true, data: summary };
  }
}
