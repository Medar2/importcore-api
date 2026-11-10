import { SetMetadata } from '@nestjs/common';

export const OWNERSHIP_KEY = 'ownership';
export const OWNERSHIP_RESOURCE_PARAM = 'resourceParam';
export const OWNERSHIP_RESOURCE_TYPE = 'resourceType';

/**
 * Opciones para el decorador @CheckOwnership
 */
export interface OwnershipOptions {
  /**
   * Nombre del parámetro en el request que contiene el ID del recurso
   * Por ejemplo: 'id' en /resources/:id
   */
  resourceParam: string;

  /**
   * Tipo de recurso a verificar
   * Por ejemplo: 'document', 'project', 'folder', etc.
   */
  resourceType: string;

  /**
   * Si es true, el acceso se otorga si el usuario es propietario O tiene permisos
   * Si es false (default), solo se otorga si es propietario
   */
  allowWithPermission?: boolean;
}

/**
 * Decorador para marcar un endpoint con verificación de ownership
 *
 * Uso:
 * ```typescript
 * @Controller('documents')
 * class DocumentsController {
 *   @Get(':id')
 *   @CheckOwnership({ resourceParam: 'id', resourceType: 'document' })
 *   getDocument(@Param('id') id: string) { ... }
 * }
 * ```
 */
export const CheckOwnership = (options: OwnershipOptions) =>
  SetMetadata(OWNERSHIP_KEY, options);
