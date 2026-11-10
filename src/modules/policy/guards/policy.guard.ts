import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PolicyService } from '../services/policy.service';
import { PolicyEvaluationContext } from '../services/policy-engine.service';
import { AuditService } from '../../audit/services/audit.service';

@Injectable()
export class PolicyGuard implements CanActivate {
  private readonly logger = new Logger(PolicyGuard.name);

  constructor(
    private readonly policyService: PolicyService,
    private readonly auditService: AuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Si no hay usuario, permitir (el JwtAuthGuard ya se encarga de esto)
    if (!user) {
      return true;
    }

    // Extraer información del request
    const resource = this.extractResource(request.url);
    const action = request.method;

    // Construir contexto de evaluación
    const policyContext: PolicyEvaluationContext = {
      userId: user.id,
      userEmail: user.email,
      userRoles: user.roles?.map((r: any) => r.name) || [],
      userDepartment: user.department,
      organizationId: user.organizationId,
      resource,
      resourceId: request.params.id,
      action,
      ipAddress: request.ip,
    };

    this.logger.debug(
      `Evaluating policies for user ${user.id}, resource: ${resource}, action: ${action}`,
    );

    try {
      const allowed = await this.policyService.evaluatePolicies(
        resource,
        action,
        policyContext,
        user.organizationId,
      );

      if (!allowed) {
        // Log ACCESS_DENIED por política
        await this.auditService.logAccess({
          userId: user.id,
          userEmail: user.email,
          organizationId: user.organizationId,
          action: 'ACCESS_DENIED',
          resource: resource.toUpperCase(),
          resourceId: request.params.id,
          result: 'denied',
          reason: 'Policy denied access',
          metadata: {
            policyEvaluated: true,
            resource,
            action,
          },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
          method: request.method,
          endpoint: request.url,
        });

        this.logger.warn(
          `Policy denied access for user ${user.id} on ${resource}:${action}`,
        );

        throw new ForbiddenException('Access denied by policy');
      }

      // Log ACCESS_GRANTED si la política permite
      await this.auditService.logAccess({
        userId: user.id,
        userEmail: user.email,
        organizationId: user.organizationId,
        action: 'ACCESS_GRANTED',
        resource: resource.toUpperCase(),
        resourceId: request.params.id,
        result: 'success',
        reason: 'Policy allowed access',
        metadata: {
          policyEvaluated: true,
          resource,
          action,
        },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        method: request.method,
        endpoint: request.url,
      });

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(
        `Error evaluating policies: ${error.message}`,
        error.stack,
      );
      // En caso de error, permitir acceso (fail-open)
      return true;
    }
  }

  private extractResource(url: string): string {
    const parts = url.split('/').filter((p) => p && !p.match(/^\d+$/));
    if (parts.length >= 2) {
      return parts[1].toLowerCase();
    }
    return 'unknown';
  }
}
