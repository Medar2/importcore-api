import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MODULE_KEY } from '../decorators/require-module.decorator';
import { AppModulesService } from '../services/app-modules.service';

/**
 * Bloquea endpoints cuyo módulo de aplicación está desactivado
 * para la organización del usuario autenticado.
 *
 * Debe ejecutarse después de JwtAuthGuard para tener request.user.
 * Requests públicas (sin usuario) se evalúan contra el scope global.
 */
@Injectable()
export class ModuleAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly appModulesService: AppModulesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const moduleCode = this.reflector.getAllAndOverride<string>(MODULE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!moduleCode) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const organizationId = request.user?.organizationId ?? null;

    const enabled = await this.appModulesService.isModuleEnabled(
      moduleCode,
      organizationId,
    );

    if (!enabled) {
      throw new ForbiddenException(
        `El módulo '${moduleCode}' no está activo para esta organización`,
      );
    }

    return true;
  }
}
