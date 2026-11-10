export class PermissionDto {
  id: string;
  code: string;
  module: string;
  resource: string;
  action: string;
  description?: string;
  source: 'role' | 'direct' | 'delegated';
  context?: any;
  startsAt?: Date;
  expiresAt?: Date;
  roleName?: string;
  delegatorEmail?: string;
}

export class UserPermissionsResponseDto {
  userId: string;
  userEmail: string;
  permissions: PermissionDto[];
}
