import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { OrganizationService } from '../../modules/organization/services/organization.service';

/**
 * Interceptor que filtra automáticamente las consultas por organizationId
 * Extrae el organizationId del token JWT y lo inyecta en las queries
 */
@Injectable()
export class OrganizationInterceptor implements NestInterceptor {
  private readonly logger = new Logger(OrganizationInterceptor.name);

  constructor(private readonly organizationService: OrganizationService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Si no hay usuario, permitir acceso
    if (!user) {
      return next.handle();
    }

    const isSuperAdmin = await this.organizationService.isSuperAdmin(user.id);
    if (isSuperAdmin) {
      this.logger.debug(
        `Superadmin user ${user.id}, skipping organization filter`,
      );
      return next.handle();
    }

    // Agregar organizationId al request para uso posterior
    request.organizationId = user.organizationId;

    this.logger.debug(
      `OrganizationInterceptor: Filtering by organization ${user.organizationId} for user ${user.id}`,
    );

    return next.handle().pipe(
      tap(() => {
        this.logger.debug(
          `Request completed for user ${user.id} in organization ${user.organizationId}`,
        );
      }),
    );
  }
}
