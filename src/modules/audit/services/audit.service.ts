import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';

export interface AccessEvent {
  userId: string;
  userEmail: string;
  organizationId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  result: 'success' | 'failure' | 'denied';
  reason?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  method?: string;
  endpoint?: string;
}

export interface PermissionChangeEvent {
  userId: string;
  userEmail: string;
  organizationId?: string;
  action:
    | 'PERMISSION_GRANTED'
    | 'PERMISSION_REVOKED'
    | 'ROLE_ASSIGNED'
    | 'ROLE_REVOKED';
  resource: string;
  resourceId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuthEvent {
  userId?: string;
  userEmail: string;
  organizationId?: string;
  action:
    | 'LOGIN_SUCCESS'
    | 'LOGIN_FAILED'
    | 'LOGOUT'
    | 'MFA_ENABLED'
    | 'MFA_DISABLED'
    | 'MFA_VERIFIED';
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditFilters {
  userId?: string;
  userEmail?: string;
  organizationId?: string;
  action?: string;
  resource?: string;
  result?: 'success' | 'failure' | 'denied';
  startDate?: Date;
  endDate?: Date;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  /**
   * Registra un intento de acceso (éxito/fallo/denegado)
   * Método append-only, no permite updates ni deletes
   */
  async logAccess(event: AccessEvent): Promise<void> {
    try {
      const auditLog = this.auditLogRepository.create({
        timestamp: new Date(),
        userId: event.userId,
        userEmail: event.userEmail,
        organizationId: event.organizationId,
        action: event.action,
        resource: event.resource,
        resourceId: event.resourceId,
        result: event.result,
        reason: event.reason,
        metadata: event.metadata || {},
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        method: event.method,
        endpoint: event.endpoint,
      });

      await this.auditLogRepository.save(auditLog);

      this.logger.debug(
        `Access logged: ${event.action} on ${event.resource} by ${event.userEmail} - ${event.result}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to log access event: ${error.message}`,
        error.stack,
      );
      // No lanzar error para no interrumpir el flujo principal
    }
  }

  /**
   * Registra un cambio de permisos
   * Método append-only
   */
  async logPermissionChange(event: PermissionChangeEvent): Promise<void> {
    try {
      const auditLog = this.auditLogRepository.create({
        timestamp: new Date(),
        userId: event.userId,
        userEmail: event.userEmail,
        organizationId: event.organizationId,
        action: event.action,
        resource: event.resource,
        resourceId: event.resourceId,
        result: 'success',
        metadata: event.metadata || {},
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
      });

      await this.auditLogRepository.save(auditLog);

      this.logger.debug(
        `Permission change logged: ${event.action} on ${event.resource} by ${event.userEmail}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to log permission change: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Registra un evento de autenticación
   * Método append-only
   */
  async logAuthEvent(event: AuthEvent): Promise<void> {
    try {
      const auditLog = this.auditLogRepository.create({
        timestamp: new Date(),
        userId: event.userId,
        userEmail: event.userEmail,
        organizationId: event.organizationId,
        action: event.action,
        resource: 'AUTH',
        result: event.action.includes('FAILED') ? 'failure' : 'success',
        metadata: event.metadata || {},
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
      });

      await this.auditLogRepository.save(auditLog);

      this.logger.debug(
        `Auth event logged: ${event.action} for ${event.userEmail}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to log auth event: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Consulta logs con filtros
   */
  async queryLogs(filters: AuditFilters): Promise<AuditLog[]> {
    const query = this.auditLogRepository.createQueryBuilder('audit');

    if (filters.userId) {
      query.andWhere('audit.userId = :userId', { userId: filters.userId });
    }

    if (filters.userEmail) {
      query.andWhere('audit.userEmail = :userEmail', {
        userEmail: filters.userEmail,
      });
    }

    if (filters.organizationId) {
      query.andWhere('audit.organizationId = :organizationId', {
        organizationId: filters.organizationId,
      });
    }

    if (filters.action) {
      query.andWhere('audit.action = :action', { action: filters.action });
    }

    if (filters.resource) {
      query.andWhere('audit.resource = :resource', {
        resource: filters.resource,
      });
    }

    if (filters.result) {
      query.andWhere('audit.result = :result', { result: filters.result });
    }

    if (filters.startDate && filters.endDate) {
      query.andWhere('audit.timestamp BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    } else if (filters.startDate) {
      query.andWhere('audit.timestamp >= :startDate', {
        startDate: filters.startDate,
      });
    } else if (filters.endDate) {
      query.andWhere('audit.timestamp <= :endDate', {
        endDate: filters.endDate,
      });
    }

    query.orderBy('audit.timestamp', 'DESC');
    query.limit(1000); // Límite de seguridad

    return query.getMany();
  }

  /**
   * Exporta logs en JSON o CSV
   */
  async exportLogs(
    filters: AuditFilters,
    format: 'json' | 'csv',
  ): Promise<Buffer> {
    const logs = await this.queryLogs(filters);

    if (format === 'json') {
      const jsonString = JSON.stringify(logs, null, 2);
      return Buffer.from(jsonString, 'utf-8');
    } else {
      // CSV format
      const headers = [
        'timestamp',
        'userId',
        'userEmail',
        'organizationId',
        'action',
        'resource',
        'resourceId',
        'result',
        'reason',
        'ipAddress',
        'userAgent',
        'method',
        'endpoint',
      ];

      const csvRows = [headers.join(',')];

      for (const log of logs) {
        const row = [
          log.timestamp?.toISOString() || '',
          log.userId || '',
          log.userEmail || '',
          log.organizationId || '',
          log.action || '',
          log.resource || '',
          log.resourceId || '',
          log.result || '',
          log.reason || '',
          log.ipAddress || '',
          log.userAgent || '',
          log.method || '',
          log.endpoint || '',
        ];

        csvRows.push(row.map((field) => `"${field}"`).join(','));
      }

      return Buffer.from(csvRows.join('\n'), 'utf-8');
    }
  }

  /**
   * Obtiene estadísticas de auditoría
   */
  async getStats(filters: AuditFilters): Promise<{
    totalLogs: number;
    byAction: Record<string, number>;
    byResult: Record<string, number>;
    byResource: Record<string, number>;
  }> {
    const logs = await this.queryLogs(filters);

    const stats = {
      totalLogs: logs.length,
      byAction: {} as Record<string, number>,
      byResult: {} as Record<string, number>,
      byResource: {} as Record<string, number>,
    };

    for (const log of logs) {
      // Count by action
      if (log.action) {
        stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;
      }

      // Count by result
      if (log.result) {
        stats.byResult[log.result] = (stats.byResult[log.result] || 0) + 1;
      }

      // Count by resource
      if (log.resource) {
        stats.byResource[log.resource] =
          (stats.byResource[log.resource] || 0) + 1;
      }
    }

    return stats;
  }
}
