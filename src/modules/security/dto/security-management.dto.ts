import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
  IsUUID,
} from 'class-validator';

export class CreatePermissionDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  module: string;

  @IsString()
  @IsNotEmpty()
  resource: string;

  @IsString()
  @IsNotEmpty()
  action: string;
}

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isSystemRole?: boolean;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  permissionIds?: string[];

  @IsString()
  @IsOptional()
  color?: string;
}

export class AssignRolesDto {
  @IsArray()
  @IsUUID('4', { each: true })
  @IsNotEmpty()
  roleIds: string[];
}

export class UpdateRoleDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  permissionIds?: string[];

  @IsString()
  @IsOptional()
  color?: string;
}
