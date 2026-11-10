import {
  IsUUID,
  IsNotEmpty,
  IsDateString,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateSubscriptionDto {
  @IsUUID('4')
  @IsNotEmpty()
  userId: string;

  @IsUUID('4')
  @IsNotEmpty()
  planId: string;

  @IsDateString()
  @IsOptional()
  startDate?: Date;

  @IsDateString()
  @IsOptional()
  endDate?: Date;

  @IsString()
  @IsOptional()
  status?: string;
}

export class UpdateSubscriptionDto {
  @IsUUID('4')
  @IsOptional()
  planId?: string;

  @IsDateString()
  @IsOptional()
  endDate?: Date;

  @IsString()
  @IsOptional()
  status?: string;
}
