import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsObject,
  IsArray,
  IsString as IsStringEach,
  ArrayNotEmpty,
} from 'class-validator';

export class CreateSubscriptionPlanDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @IsNotEmpty()
  price: number;

  @IsString()
  @IsNotEmpty()
  interval: string; // 'monthly', 'yearly'

  @IsObject()
  @IsOptional()
  features?: any;

  @IsArray()
  @ArrayNotEmpty()
  @IsStringEach({ each: true })
  @IsOptional()
  modules?: string[];

  @IsString()
  @IsOptional()
  status?: string;
}

export class UpdateSubscriptionPlanDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  interval?: string;

  @IsObject()
  @IsOptional()
  features?: any;

  @IsArray()
  @IsStringEach({ each: true })
  @IsOptional()
  modules?: string[];

  @IsString()
  @IsOptional()
  status?: string;
}
