import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isSystem?: boolean;

  @IsOptional()
  @IsBoolean()
  isGlobal?: boolean;

  @IsOptional()
  @IsString()
  organizationId?: string;
}

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class AssignPermissionToRoleDto {
  @IsString()
  @IsNotEmpty()
  permissionCode: string;

  @IsOptional()
  context?: {
    organizationId?: string;
    projectId?: string;
    resourceId?: string;
    [key: string]: any;
  };
}
