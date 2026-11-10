import { IsString, IsNotEmpty, IsArray, IsDateString } from 'class-validator';

export class DelegatePermissionsDto {
  @IsString()
  @IsNotEmpty()
  delegateId: string;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  permissionCodes: string[];

  @IsDateString()
  startsAt: string;

  @IsDateString()
  expiresAt: string;
}

export class RevokeDelegationDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}
