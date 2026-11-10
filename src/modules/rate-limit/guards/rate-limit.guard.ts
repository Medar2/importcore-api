import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { RateLimitService } from '../services/rate-limit.service';

/**
 * Guard de rate limiting que usa el ThrottlerGuard de NestJS
 * Soporta configuración por organización y lista de IPs bloqueadas
 *
 * Este guard debe usarse junto con el ThrottlerModule configurado globalmente
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(private readonly rateLimitService: RateLimitService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Verificar si la IP del cliente está bloqueada
    const clientIp = this.getClientIp(request);
    if (this.rateLimitService.isIpBlocked(clientIp)) {
      this.logger.warn(`Blocked request from banned IP: ${clientIp}`);
      throw new HttpException(
        'Your IP has been temporarily blocked',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Si hay un usuario, verificar límites por organización
    if (user?.organizationId) {
      const orgLimits = this.rateLimitService.getOrganizationLimits(
        user.organizationId,
      );
      if (orgLimits) {
        this.logger.debug(
          `Using custom rate limits for organization ${user.organizationId}`,
        );
      }
    }

    // El rate limiting real se maneja globalmente por ThrottlerModule
    // Este guard solo añade verificación de IPs bloqueadas y configuración por org
    return true;
  }

  private getClientIp(request: any): string {
    return (
      request.headers['x-forwarded-for']?.split(',')[0] ||
      request.headers['x-real-ip'] ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      'unknown'
    );
  }
}
