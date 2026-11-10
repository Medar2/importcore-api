import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator to mark endpoints with required permissions
 * @param permissions - List of permission codes required to access the endpoint
 * @example
 * @RequirePermission('USERS.PROFILE.READ')
 * @RequirePermission('USERS.PROFILE.READ', 'USERS.PROFILE.WRITE')
 */
export const RequirePermission = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
