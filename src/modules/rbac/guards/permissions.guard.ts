import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionVerificationService } from '../services/permission-verification.service';
import { AuditService } from '../../audit/services/audit.service';
import { PERMISSIONS_KEY } from '../decorators/require-permission.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly permissionVerificationService: PermissionVerificationService,
    private readonly auditService: AuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Obtener permisos requeridos del decorador
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Si no hay permisos requeridos, permitir acceso
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      this.logger.warn('No user found in request');
      throw new ForbiddenException('User not authenticated');
    }

    if (user.isSuperAdmin) {
      this.logger.debug(`SuperAdmin ${user.id} bypassed permission check`);
      return true;
    }

    // Extraer contexto del request
    const permissionContext = {
      organizationId: user.organizationId,
      // Agregar otros campos del contexto según sea necesario
    };

    this.logger.debug(
      `Checking permissions for user ${user.id}: ${requiredPermissions.join(', ')}`,
    );

    // Verificar cada permiso requerido
    for (const permission of requiredPermissions) {
      const hasPermission =
        await this.permissionVerificationService.hasPermission(
          user.id,
          permission,
          permissionContext,
        );

      if (!hasPermission) {
        this.logger.warn(
          `User ${user.id} denied access - missing permission: ${permission}`,
        );

        // Log ACCESS_DENIED
        await this.auditService.logAccess({
          userId: user.id,
          userEmail: user.person?.email || 'unknown',
          organizationId: user.organizationId,
          action: 'ACCESS_DENIED',
          resource: this.extractResource(request.url),
          result: 'denied',
          reason: `Missing permission: ${permission}`,
          metadata: {
            permissionChecked: permission,
            requiredPermissions,
          },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
          method: request.method,
          endpoint: request.url,
        });

        throw new ForbiddenException(
          `Insufficient permissions. Required: ${permission}`,
        );
      }
    }

    this.logger.debug(
      `User ${user.id} granted access - all permissions verified`,
    );

    // Log ACCESS_GRANTED
    await this.auditService.logAccess({
      userId: user.id,
      userEmail: user.person?.email || 'unknown',
      organizationId: user.organizationId,
      action: 'ACCESS_GRANTED',
      resource: this.extractResource(request.url),
      result: 'success',
      reason: 'All required permissions verified',
      metadata: {
        permissionChecked: requiredPermissions.join(', '),
        requiredPermissions,
      },
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      method: request.method,
      endpoint: request.url,
    });

    return true;
  }

  private extractResource(url: string): string {
    // Extract resource from URL
    // Example: /api/users/123 -> USERS
    // Example: /rbac/permissions -> PERMISSIONS
    const parts = url.split('/').filter((p) => p && !p.match(/^\d+$/));
    if (parts.length >= 2) {
      return parts[1].toUpperCase();
    }
    return 'UNKNOWN';
  }
}
