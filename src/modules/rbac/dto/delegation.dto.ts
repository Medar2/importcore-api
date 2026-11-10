import { IsString, IsArray, IsDateString } from 'class-validator';

export class DelegatePermissionsDto {
  @IsString()
  delegateUserId: string;

  @IsArray()
  @IsString({ each: true })
  permissionCodes: string[];

  @IsDateString()
  startsAt: string;

  @IsDateString()
  expiresAt: string;
}

export class DelegationResponseDto {
  id: string;
  delegatorId: string;
  delegatorEmail: string;
  delegateId: string;
  delegateEmail: string;
  permissionCodes: string[];
  startsAt: Date;
  expiresAt: Date;
  isActive: boolean;
  createdAt: Date;
}
