import { SetMetadata } from '@nestjs/common';

export const MODULE_KEY = 'required_module';

/**
 * Decorator que marca un endpoint/controlador como perteneciente a un
 * módulo de aplicación (app_module.code). Si el módulo está desactivado
 * para el scope del usuario, ModuleAccessGuard responde 403.
 *
 * @example
 * @RequireModule('POS')
 */
export const RequireModule = (code: string) =>
  SetMetadata(MODULE_KEY, code.toUpperCase());
