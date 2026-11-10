import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AuditService } from '../../modules/audit/services/audit.service';
import { Reflector } from '@nestjs/core';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly auditService: AuditService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Skip if no user (public endpoints)
    if (!user) {
      return next.handle();
    }

    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || '';

    // Extract action from decorator if available
    const action = this.reflector.get<string>(
      'audit-action',
      context.getHandler(),
    );

    return next.handle().pipe(
      tap(() => {
        // Log successful request
        this.auditService
          .logAccess({
            userId: user.id,
            userEmail: user.person?.email || 'unknown',
            organizationId: user.organizationId,
            action: action || method,
            resource: this.extractResource(url),
            result: 'success',
            metadata: {
              endpoint: url,
            },
            ipAddress: ip,
            userAgent,
            method,
            endpoint: url,
          })
          .catch((error) => {
            this.logger.error(`Failed to log audit: ${error.message}`);
          });
      }),
      catchError((error) => {
        // Log failed request
        this.auditService
          .logAccess({
            userId: user.id,
            userEmail: user.person?.email || 'unknown',
            organizationId: user.organizationId,
            action: action || method,
            resource: this.extractResource(url),
            result: 'failure',
            reason: error.message,
            metadata: {
              endpoint: url,
              errorType: error.constructor.name,
            },
            ipAddress: ip,
            userAgent,
            method,
            endpoint: url,
          })
          .catch((auditError) => {
            this.logger.error(`Failed to log audit: ${auditError.message}`);
          });

        return throwError(() => error);
      }),
    );
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
