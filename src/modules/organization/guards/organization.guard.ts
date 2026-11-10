import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { OrganizationService } from '../services/organization.service';

@Injectable()
export class OrganizationGuard implements CanActivate {
  private readonly logger = new Logger(OrganizationGuard.name);

  constructor(private readonly organizationService: OrganizationService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Si no hay usuario, el JwtAuthGuard ya se encarga
    if (!user) {
      return true;
    }

    // Verificar si es superadmin
    const isSuperAdmin = await this.organizationService.isSuperAdmin(user.id);
    if (isSuperAdmin) {
      this.logger.debug(
        `Superadmin user ${user.id}, allowing cross-organization access`,
      );
      return true;
    }

    // Extraer organizationId del recurso (si está en los parámetros)
    const resourceOrganizationId =
      request.params.organizationId || request.body.organizationId;

    // Si hay un organizationId en el recurso, verificar que coincida
    if (resourceOrganizationId && user.organizationId) {
      if (resourceOrganizationId !== user.organizationId) {
        this.logger.warn(
          `Organization mismatch: user ${user.id} (org: ${user.organizationId}) tried to access resource in org ${resourceOrganizationId}`,
        );

        throw new ForbiddenException(
          'You do not have access to this organization',
        );
      }
    }

    // Verificar que el usuario tiene una organización asignada
    if (!user.organizationId) {
      this.logger.warn(
        `User ${user.id} does not have an organization assigned`,
      );
      throw new ForbiddenException('User does not belong to any organization');
    }

    this.logger.debug(
      `OrganizationGuard: User ${user.id} authorized for organization ${user.organizationId}`,
    );

    return true;
  }
}
