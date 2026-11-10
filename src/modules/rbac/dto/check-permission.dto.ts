import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class CheckPermissionDto {
  @IsString()
  @IsNotEmpty()
  permissionCode: string;

  @IsOptional()
  @IsObject()
  context?: {
    organizationId?: string;
    projectId?: string;
    resourceId?: string;
    [key: string]: any;
  };
}

export class CheckPermissionBatchDto {
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  permissionCodes: string[];

  @IsOptional()
  @IsObject()
  context?: {
    organizationId?: string;
    projectId?: string;
    resourceId?: string;
    [key: string]: any;
  };
}
