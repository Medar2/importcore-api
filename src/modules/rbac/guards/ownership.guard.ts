import {
  Injectable,
  CanActivate,
  ExecutionContext,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OwnershipService } from '../services/ownership.service';
import {
  OWNERSHIP_KEY,
  OwnershipOptions,
} from '../decorators/check-ownership.decorator';
import { AuditService } from '../../audit/services/audit.service';

@Injectable()
export class OwnershipGuard implements CanActivate {
  private readonly logger = new Logger(OwnershipGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly ownershipService: OwnershipService,
    private readonly auditService: AuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Obtener configuración del decorador
    const ownershipOptions = this.reflector.get<OwnershipOptions>(
      OWNERSHIP_KEY,
      context.getHandler(),
    );

    // Si no hay configuración de ownership, permitir acceso
    if (!ownershipOptions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      this.logger.warn('No user found in request');
      throw new NotFoundException('User not authenticated');
    }

    // Extraer el ID del recurso del request
    const resourceId = request.params[ownershipOptions.resourceParam];
    if (!resourceId) {
      this.logger.warn(
        `Resource param '${ownershipOptions.resourceParam}' not found in request`,
      );
      throw new NotFoundException('Resource not found');
    }

    const resourceType = ownershipOptions.resourceType;

    this.logger.debug(
      `Checking ownership: user=${user.id}, resource=${resourceId}, type=${resourceType}`,
    );

    try {
      // Verificar ownership
      const hasOwnership = await this.ownershipService.checkOwnership(
        user.id,
        resourceId,
        resourceType,
      );

      if (hasOwnership) {
        // Log ACCESS_GRANTED por ownership
        await this.auditService.logAccess({
          userId: user.id,
          userEmail: user.email,
          organizationId: user.organizationId,
          action: 'ACCESS_GRANTED',
          resource: resourceType.toUpperCase(),
          resourceId,
          result: 'success',
          reason: 'Owner access granted',
          metadata: {
            ownershipVerified: true,
            resourceType,
          },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
          method: request.method,
          endpoint: request.url,
        });

        return true;
      }

      // Si allowWithPermission es true, verificar permisos
      if (ownershipOptions.allowWithPermission) {
        this.logger.debug(
          `Ownership check failed, but allowWithPermission is true, checking permissions`,
        );
        // En este caso, el PermissionsGuard se encargará de verificar permisos
        return true;
      }

      // Log ACCESS_DENIED
      await this.auditService.logAccess({
        userId: user.id,
        userEmail: user.email,
        organizationId: user.organizationId,
        action: 'ACCESS_DENIED',
        resource: resourceType.toUpperCase(),
        resourceId,
        result: 'denied',
        reason: 'Not owner of resource',
        metadata: {
          ownershipVerified: false,
          resourceType,
        },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        method: request.method,
        endpoint: request.url,
      });

      this.logger.warn(
        `Ownership denied: user ${user.id} is not owner of resource ${resourceId} (type: ${resourceType})`,
      );

      throw new NotFoundException(
        'Resource not found or you do not have access to it',
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error checking ownership: ${error.message}`,
        error.stack,
      );
      throw new NotFoundException('Resource not found');
    }
  }
}
