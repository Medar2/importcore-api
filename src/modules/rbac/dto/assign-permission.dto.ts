import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
  IsDateString,
} from 'class-validator';

export class AssignPermissionDto {
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

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
